package person_attributes

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	errs "person-service/errors"
	db "person-service/internal/db/generated"
	"person-service/logging"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

// Meta contains request metadata for tracing and auditing
type Meta struct {
	Caller  string `json:"caller"`
	Reason  string `json:"reason"`
	TraceID string `json:"traceId"`
}

// CreateAttributeRequest represents the request body for creating an attribute
type CreateAttributeRequest struct {
	Key   string `json:"key" validate:"required"`
	Value string `json:"value"`
	Meta  *Meta  `json:"meta"`
}

// UpdateAttributeRequest represents the request body for updating an attribute
type UpdateAttributeRequest struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Version *int64 `json:"version"`
	Meta    *Meta  `json:"meta"`
}

// PersonAttributesHandler handles person attributes operations
type PersonAttributesHandler struct {
	queries       *db.Queries
	encryptionKey string
	keyVersion    int64
}

// NewPersonAttributesHandler creates a new instance of PersonAttributesHandler
func NewPersonAttributesHandler(queries *db.Queries) *PersonAttributesHandler {
	encryptionKey := os.Getenv("ENCRYPTION_KEY_1")
	if encryptionKey == "" {
		encryptionKey = "default-key-for-dev"
	}

	return &PersonAttributesHandler{
		queries:       queries,
		encryptionKey: encryptionKey,
		keyVersion:    1,
	}
}

// CreateAttribute handles POST/PUT /persons/:personId/attributes - creates or updates an attribute
func (h *PersonAttributesHandler) CreateAttribute(c echo.Context) error {
	// Parse person ID from path
	personIDStr := c.Param("personId")
	var personID pgtype.UUID
	err := personID.Scan(personIDStr)
	if err != nil {
		// Return 404 for invalid UUID (treat as person not found)
		return c.JSON(http.StatusNotFound, errs.ErrorResponse{
			Message:   "Person not found",
			ErrorCode: errs.ErrInvalidPersonID,
		})
	}

	// Parse request body
	var req CreateAttributeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid request body",
			ErrorCode: errs.ErrInvalidRequestBody,
		})
	}

	// Validate required fields
	if req.Key == "" || strings.TrimSpace(req.Key) == "" {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Key is required",
			ErrorCode: errs.ErrMissingRequiredFieldKey,
		})
	}

	// Validate meta is present
	if req.Meta == nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Missing required field \"meta\"",
			ErrorCode: errs.ErrMissingRequiredFieldMeta,
		})
	}

	// Validate meta has required fields (traceId is optional - if empty, no audit log is created)
	if req.Meta.Caller == "" || req.Meta.Reason == "" {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Meta fields (caller, reason) are required",
			ErrorCode: errs.ErrMissingRequiredFieldMeta,
		})
	}

	// Use request context for trace propagation
	ctx := c.Request().Context()

	// Check if person exists
	_, err = h.queries.GetPersonById(ctx, personID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusNotFound, errs.ErrorResponse{
				Message:   "Person not found",
				ErrorCode: errs.ErrPersonNotFound,
			})
		}
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to verify person",
			ErrorCode: errs.ErrFailedVerifyPerson,
		})
	}

	// Create or update the attribute
	_, err = h.queries.CreateOrUpdatePersonAttribute(ctx, db.CreateOrUpdatePersonAttributeParams{
		PersonID:       personID,
		AttributeKey:   req.Key,
		AttributeValue: req.Value,
		EncKey:         h.encryptionKey,
		KeyVersion:     h.keyVersion,
	})

	if err != nil {
		logging.ErrorContext(ctx, "Failed to create attribute", "error", err)
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to create attribute",
			ErrorCode: errs.ErrFailedCreateAttribute,
		})
	}

	// Log the request to audit log (request_log table)
	if req.Meta != nil && req.Meta.TraceID != "" {
		// Serialize request body and response for audit
		requestBody := fmt.Sprintf(`{"key":"%s","value":"%s"}`, req.Key, req.Value)
		responseBody := "" // Will be populated after getting the attribute

		_, logErr := h.queries.InsertRequestLog(ctx, db.InsertRequestLogParams{
			TraceID:               req.Meta.TraceID,
			CallerInfo:                req.Meta.Caller,
			Reason:                req.Meta.Reason,
			EncryptedRequestBody:  requestBody,
			EncryptedResponseBody: responseBody,
			EncKey:                h.encryptionKey,
			KeyVersion:            h.keyVersion,
		})

		// Note: If InsertRequestLog fails, we still continue successfully
		// because audit logging should not block the main operation
		_ = logErr
	}

	// Get the created attribute with decrypted value
	attribute, err := h.queries.GetPersonAttribute(ctx, db.GetPersonAttributeParams{
		PersonID:     personID,
		AttributeKey: req.Key,
		EncKey:       h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve attribute",
			ErrorCode: errs.ErrFailedRetrieveAttribute,
		})
	}

	// Build response
	response := map[string]interface{}{
		"id":      attribute.ID,
		"key":     attribute.AttributeKey,
		"value":   string(attribute.AttributeValue),
		"version": attribute.Version,
	}

	if attribute.CreatedAt.Valid {
		response["createdAt"] = attribute.CreatedAt.Time
	}
	if attribute.UpdatedAt.Valid {
		response["updatedAt"] = attribute.UpdatedAt.Time
	}

	// Always return 201 Created for this endpoint, even if it's an upsert
	// This is because from the client's perspective, they're creating/setting an attribute
	return c.JSON(http.StatusCreated, response)
}

// GetAllAttributes handles GET /persons/:personId/attributes - retrieves all attributes for a person
func (h *PersonAttributesHandler) GetAllAttributes(c echo.Context) error {
	// Parse person ID from path
	personIDStr := c.Param("personId")
	var personID pgtype.UUID
	err := personID.Scan(personIDStr)
	if err != nil {
		// Return 404 for invalid UUID (treat as person not found)
		return c.JSON(http.StatusNotFound, errs.ErrorResponse{
			Message:   "Person not found",
			ErrorCode: errs.ErrInvalidPersonID,
		})
	}

	// Use request context for trace propagation
	ctx := c.Request().Context()

	// Check if person exists
	_, err = h.queries.GetPersonById(ctx, personID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusNotFound, errs.ErrorResponse{
				Message:   "Person not found",
				ErrorCode: errs.ErrPersonNotFound,
			})
		}
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to verify person",
			ErrorCode: errs.ErrFailedVerifyPerson,
		})
	}

	// Get all attributes for the person
	attributes, err := h.queries.GetAllPersonAttributes(ctx, db.GetAllPersonAttributesParams{
		PersonID: personID,
		EncKey:   h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve attributes",
			ErrorCode: errs.ErrFailedRetrieveAttributes,
		})
	}

	// Build response array
	response := make([]map[string]interface{}, 0, len(attributes))
	for _, attr := range attributes {
		item := map[string]interface{}{
			"id":      attr.ID,
			"key":     attr.AttributeKey,
			"value":   string(attr.AttributeValue),
			"version": attr.Version,
		}
		if attr.CreatedAt.Valid {
			item["createdAt"] = attr.CreatedAt.Time
		}
		if attr.UpdatedAt.Valid {
			item["updatedAt"] = attr.UpdatedAt.Time
		}
		response = append(response, item)
	}

	return c.JSON(http.StatusOK, response)
}

// GetAttribute handles GET /persons/:personId/attributes/:attributeId - retrieves a specific attribute
func (h *PersonAttributesHandler) GetAttribute(c echo.Context) error {
	// Parse person ID from path
	personIDStr := c.Param("personId")
	var personID pgtype.UUID
	err := personID.Scan(personIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid person ID format",
			ErrorCode: errs.ErrInvalidPersonID,
		})
	}

	// Parse attribute ID from path
	attributeIDStr := c.Param("attributeId")
	attributeID, err := strconv.ParseInt(attributeIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid attribute ID format",
			ErrorCode: errs.ErrInvalidAttributeIDFormat,
		})
	}

	// Use request context for trace propagation
	ctx := c.Request().Context()

	// Check if person exists
	_, err = h.queries.GetPersonById(ctx, personID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusNotFound, errs.ErrorResponse{
				Message:   "Person not found",
				ErrorCode: errs.ErrPersonNotFound,
			})
		}
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to verify person",
			ErrorCode: errs.ErrFailedVerifyPerson,
		})
	}

	// Get all attributes and find the one with matching ID
	attributes, err := h.queries.GetAllPersonAttributes(ctx, db.GetAllPersonAttributesParams{
		PersonID: personID,
		EncKey:   h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve attributes",
			ErrorCode: errs.ErrFailedRetrieveAttributes,
		})
	}

	// Find the attribute with matching ID
	var foundAttr *db.GetAllPersonAttributesRow
	for _, attr := range attributes {
		if attr.ID == attributeID {
			foundAttr = &attr
			break
		}
	}

	if foundAttr == nil {
		return c.JSON(http.StatusNotFound, errs.ErrorResponse{
			Message:   "Attribute not found",
			ErrorCode: errs.ErrAttributeNotFound,
		})
	}

	// Build response
	response := map[string]interface{}{
		"id":      foundAttr.ID,
		"key":     foundAttr.AttributeKey,
		"value":   string(foundAttr.AttributeValue),
		"version": foundAttr.Version,
	}
	if foundAttr.CreatedAt.Valid {
		response["createdAt"] = foundAttr.CreatedAt.Time
	}
	if foundAttr.UpdatedAt.Valid {
		response["updatedAt"] = foundAttr.UpdatedAt.Time
	}

	return c.JSON(http.StatusOK, response)
}

// UpdateAttribute handles PUT /persons/:personId/attributes/:attributeId - updates a specific attribute
func (h *PersonAttributesHandler) UpdateAttribute(c echo.Context) error {
	// Parse person ID from path
	personIDStr := c.Param("personId")
	var personID pgtype.UUID
	err := personID.Scan(personIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid person ID format",
			ErrorCode: errs.ErrInvalidPersonID,
		})
	}

	// Parse attribute ID from path
	attributeIDStr := c.Param("attributeId")
	attributeID, err := strconv.ParseInt(attributeIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid attribute ID format",
			ErrorCode: errs.ErrInvalidAttributeIDFormat,
		})
	}

	// Parse request body
	var req UpdateAttributeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid request body",
			ErrorCode: errs.ErrInvalidRequestBody,
		})
	}

	// Validate value is provided and not empty/whitespace
	if strings.TrimSpace(req.Value) == "" {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Value is required",
			ErrorCode: errs.ErrMissingRequiredFieldValue,
		})
	}

	// Use request context for trace propagation
	ctx := c.Request().Context()

	// Check if person exists
	_, err = h.queries.GetPersonById(ctx, personID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusNotFound, errs.ErrorResponse{
				Message:   "Not found",
				ErrorCode: errs.ErrPersonNotFound,
			})
		}
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to verify person",
			ErrorCode: errs.ErrFailedVerifyPerson,
		})
	}

	// Get all attributes and find the one with matching ID to get the key and current version
	attributes, err := h.queries.GetAllPersonAttributes(ctx, db.GetAllPersonAttributesParams{
		PersonID: personID,
		EncKey:   h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve attributes",
			ErrorCode: errs.ErrFailedRetrieveAttributes,
		})
	}

	// Find the attribute with matching ID
	var existingAttr *db.GetAllPersonAttributesRow
	for _, attr := range attributes {
		if attr.ID == attributeID {
			existingAttr = &attr
			break
		}
	}

	if existingAttr == nil {
		return c.JSON(http.StatusNotFound, errs.ErrorResponse{
			Message:   "Attribute not found",
			ErrorCode: errs.ErrAttributeNotFound,
		})
	}

	// Determine which key to use: if new key is provided, use it; otherwise use existing key
	keyToUse := existingAttr.AttributeKey
	if req.Key != "" {
		keyToUse = req.Key
	}

	// If the key changed, we need to delete the old one first
	if req.Key != "" && req.Key != existingAttr.AttributeKey {
		err = h.queries.DeletePersonAttribute(ctx, db.DeletePersonAttributeParams{
			PersonID:     personID,
			AttributeKey: existingAttr.AttributeKey,
		})
		if err != nil {
			return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
				Message:   "Failed to update attribute key",
				ErrorCode: errs.ErrFailedUpdateAttributeKey,
			})
		}

		// Key changed: create new attribute (no version check since it's a new key)
		_, err = h.queries.CreateOrUpdatePersonAttribute(ctx, db.CreateOrUpdatePersonAttributeParams{
			PersonID:       personID,
			AttributeKey:   keyToUse,
			AttributeValue: req.Value,
			EncKey:         h.encryptionKey,
			KeyVersion:     h.keyVersion,
		})
	} else if req.Version != nil {
		// Version provided: use optimistic locking
		_, err = h.queries.UpdatePersonAttributeWithVersion(ctx, db.UpdatePersonAttributeWithVersionParams{
			PersonID:        personID,
			AttributeKey:    keyToUse,
			AttributeValue:  req.Value,
			EncKey:          h.encryptionKey,
			KeyVersion:      h.keyVersion,
			ExpectedVersion: *req.Version,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusConflict, errs.ErrorResponse{
				Message:   "Version conflict: attribute has been modified by another request",
				ErrorCode: errs.ErrVersionConflict,
			})
		}
	} else {
		// No version provided: update without version check (backward compatible)
		_, err = h.queries.CreateOrUpdatePersonAttribute(ctx, db.CreateOrUpdatePersonAttributeParams{
			PersonID:       personID,
			AttributeKey:   keyToUse,
			AttributeValue: req.Value,
			EncKey:         h.encryptionKey,
			KeyVersion:     h.keyVersion,
		})
	}

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to update attribute",
			ErrorCode: errs.ErrFailedUpdateAttribute,
		})
	}

	// Get the updated attribute
	attribute, err := h.queries.GetPersonAttribute(ctx, db.GetPersonAttributeParams{
		PersonID:     personID,
		AttributeKey: keyToUse,
		EncKey:       h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve updated attribute",
			ErrorCode: errs.ErrFailedRetrieveUpdatedAttr,
		})
	}

	// Build response
	response := map[string]interface{}{
		"id":      attribute.ID,
		"key":     attribute.AttributeKey,
		"value":   string(attribute.AttributeValue),
		"version": attribute.Version,
	}
	if attribute.CreatedAt.Valid {
		response["createdAt"] = attribute.CreatedAt.Time
	}
	if attribute.UpdatedAt.Valid {
		response["updatedAt"] = attribute.UpdatedAt.Time
	}

	return c.JSON(http.StatusOK, response)
}

// DeleteAttribute handles DELETE /persons/:personId/attributes/:attributeId - deletes a specific attribute
func (h *PersonAttributesHandler) DeleteAttribute(c echo.Context) error {
	// Parse person ID from path
	personIDStr := c.Param("personId")
	var personID pgtype.UUID
	err := personID.Scan(personIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid person ID format",
			ErrorCode: errs.ErrInvalidPersonID,
		})
	}

	// Parse attribute ID from path
	attributeIDStr := c.Param("attributeId")
	attributeID, err := strconv.ParseInt(attributeIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errs.ErrorResponse{
			Message:   "Invalid attribute ID format",
			ErrorCode: errs.ErrInvalidAttributeIDFormat,
		})
	}

	// Use request context for trace propagation
	ctx := c.Request().Context()

	// Check if person exists
	_, err = h.queries.GetPersonById(ctx, personID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.JSON(http.StatusNotFound, errs.ErrorResponse{
				Message:   "Not found",
				ErrorCode: errs.ErrPersonNotFound,
			})
		}
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to verify person",
			ErrorCode: errs.ErrFailedVerifyPerson,
		})
	}

	// Get all attributes and find the one with matching ID to get the key
	attributes, err := h.queries.GetAllPersonAttributes(ctx, db.GetAllPersonAttributesParams{
		PersonID: personID,
		EncKey:   h.encryptionKey,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to retrieve attributes",
			ErrorCode: errs.ErrFailedRetrieveAttributes,
		})
	}

	// Find the attribute with matching ID
	var keyToDelete string
	found := false
	for _, attr := range attributes {
		if attr.ID == attributeID {
			keyToDelete = attr.AttributeKey
			found = true
			break
		}
	}

	if !found {
		return c.JSON(http.StatusNotFound, errs.ErrorResponse{
			Message:   "Attribute not found",
			ErrorCode: errs.ErrAttributeNotFound,
		})
	}

	// Delete the attribute
	err = h.queries.DeletePersonAttribute(ctx, db.DeletePersonAttributeParams{
		PersonID:     personID,
		AttributeKey: keyToDelete,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, errs.ErrorResponse{
			Message:   "Failed to delete attribute",
			ErrorCode: errs.ErrFailedDeleteAttribute,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Attribute deleted successfully",
	})
}
