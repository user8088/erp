# Rental Agreement Download - Backend Requirements

## Overview

The frontend needs the ability to download rental agreements as PDF documents. This document specifies the backend API requirements for this functionality.

## API Endpoint

### Download Rental Agreement PDF

**Endpoint:** `GET /api/rentals/agreements/{id}/download`

**Method:** GET

**Path Parameters:**
- `id` (integer, required): The rental agreement ID

**Headers:**
- Authorization: Bearer token (standard authentication)
- Accept: `application/pdf` (optional, for explicit PDF request)

**Response:**

**Success Response (200 OK):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="RENT-YYYYMMDD-XXX.pdf"` (where YYYYMMDD-XXX is the agreement number)
- Body: PDF file content (binary)

**Error Responses:**
- `404 Not Found`: Rental agreement does not exist
- `403 Forbidden`: User does not have permission to view/download this agreement
- `500 Internal Server Error`: Server error during PDF generation

## PDF Content Requirements

The PDF should include the following information:

### Header Section
- Company name/logo (if available)
- Document title: "RENTAL AGREEMENT"
- Agreement number: `RENT-YYYYMMDD-XXX`
- Date generated: Current date/time

### Agreement Details Section
- **Customer Information:**
  - Customer name
  - Customer contact details (if available: email, phone, address)

- **Rental Item Information:**
  - Item name
  - Item SKU (if available)
  - Category (if available)

- **Agreement Terms:**
  - Quantity rented
  - Period type (Daily/Weekly/Monthly)
  - Start date
  - End date (if applicable/available)

### Financial Information Section
- **Security Deposit:**
  - Security deposit amount
  - Collection date (if collected)
  - Collection status

- **Payment Information:**
  - Total paid amount (sum of all payments)
  - Outstanding balance
  - Payment history table (if payments exist):
    - Period identifier
    - Amount paid
    - Payment date
    - Payment method

### Footer Section
- Agreement status (Active/Completed/Returned/Overdue)
- Created date
- Any terms and conditions or notes (if applicable)

## Technical Requirements

1. **PDF Generation Library:**
   - Use a reliable PDF generation library (e.g., Laravel Snappy, DomPDF, TCPDF, or similar)
   - Ensure proper Unicode/UTF-8 support for text rendering
   - Support for proper currency formatting (PKR)

2. **File Naming:**
   - PDF filename should match the agreement number: `RENT-YYYYMMDD-XXX.pdf`
   - Use the exact agreement number format from the database

3. **Security:**
   - Verify user has permission to access the rental agreement
   - Respect company/organization boundaries (multi-tenant support if applicable)
   - Validate the agreement ID exists and is accessible

4. **Performance:**
   - Consider caching generated PDFs if agreements don't change frequently
   - Optimize PDF generation for fast response times
   - Handle concurrent download requests appropriately

5. **Error Handling:**
   - Provide meaningful error messages
   - Log errors for debugging
   - Return appropriate HTTP status codes

## Frontend Integration

The frontend will call this endpoint and handle the PDF download as follows:

```typescript
// In apiClient.ts
async downloadAgreement(agreementId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rentals/agreements/${agreementId}/download`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/pdf',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download agreement');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RENT-${agreementId}.pdf`; // Or extract from Content-Disposition header
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

## Alternative: Streaming Response

If the backend supports streaming, the response can be streamed directly to the browser without loading the entire file into memory. The frontend implementation remains similar.

## Important Notes

### Authentication & CORS

**CRITICAL:** The download endpoint should:
- **NOT redirect** unauthenticated requests to `/login` (this causes CORS errors in the frontend)
- Return HTTP status codes instead:
  - `401 Unauthorized` if the user is not authenticated
  - `403 Forbidden` if the user doesn't have permission
- Include proper CORS headers in the response (especially `Access-Control-Allow-Origin`)
- Accept Bearer token authentication via `Authorization: Bearer {token}` header

**Why this matters:** If the backend redirects unauthenticated API requests to a login page, the frontend cannot follow the redirect due to CORS policy restrictions. API endpoints should return HTTP status codes (401/403) instead of redirecting.

### PDF Requirements

- The PDF should be professionally formatted and ready for printing
- Consider including company branding/logo if available
- Ensure all monetary values are properly formatted with currency symbols
- Dates should be formatted in a readable format (e.g., "January 2, 2026")
- The PDF should be suitable for both digital viewing and printing

