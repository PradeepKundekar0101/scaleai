"""
Hardcoded scan results for the QuickBite demo repo.
Used as fallback when Claude API is unavailable.
"""

DEMO_CODE_ANALYSIS = {
    "routes": [
        {
            "method": "POST",
            "path": "/api/auth/register",
            "file": "src/routes/auth.ts",
            "description": "Register a new user with email, password, name, and phone. Returns JWT token and user profile.",
            "middleware": [],
            "responseFields": ["token", "user.id", "user.email", "user.name", "user.role"],
            "sensitiveFields": []
        },
        {
            "method": "POST",
            "path": "/api/auth/login",
            "file": "src/routes/auth.ts",
            "description": "Authenticate user with email and password. Updates lastLoginIp. Returns JWT token and user profile.",
            "middleware": [],
            "responseFields": ["token", "user.id", "user.email", "user.name", "user.role"],
            "sensitiveFields": []
        },
        {
            "method": "POST",
            "path": "/api/auth/forgot-password",
            "file": "src/routes/auth.ts",
            "description": "Initiate password reset flow. Generates a reset token for the given email.",
            "middleware": [],
            "responseFields": ["message", "resetToken"],
            "sensitiveFields": ["resetToken"]
        },
        {
            "method": "GET",
            "path": "/api/orders",
            "file": "src/routes/orders.ts",
            "description": "Returns all orders for the authenticated user with items, totals, delivery status, and internal business metrics.",
            "middleware": ["auth"],
            "responseFields": ["id", "userId", "items", "subtotal", "deliveryFee", "total", "status", "deliveryAddress", "restaurantId", "internalMargin", "supplierCost", "deliveryPartnerPayout", "estimatedDelivery", "createdAt"],
            "sensitiveFields": ["internalMargin", "supplierCost", "deliveryPartnerPayout"]
        },
        {
            "method": "GET",
            "path": "/api/orders/:id",
            "file": "src/routes/orders.ts",
            "description": "Returns a single order by ID for the authenticated user with full details including tracking and internal costs.",
            "middleware": ["auth"],
            "responseFields": ["id", "userId", "items", "subtotal", "deliveryFee", "total", "status", "deliveryAddress", "restaurantId", "internalMargin", "supplierCost", "deliveryPartnerPayout", "trackingUrl", "estimatedDelivery", "createdAt", "updatedAt"],
            "sensitiveFields": ["internalMargin", "supplierCost", "deliveryPartnerPayout"]
        },
        {
            "method": "POST",
            "path": "/api/orders",
            "file": "src/routes/orders.ts",
            "description": "Create a new order with items, delivery address, restaurant, and payment method. Calculates internal margins and supplier costs.",
            "middleware": ["auth"],
            "responseFields": ["id", "status", "total", "estimatedDelivery"],
            "sensitiveFields": []
        },
        {
            "method": "PUT",
            "path": "/api/orders/:id/status",
            "file": "src/routes/orders.ts",
            "description": "Update the status of an existing order (pending, confirmed, preparing, out_for_delivery, delivered, cancelled).",
            "middleware": ["auth"],
            "responseFields": ["id", "status", "updatedAt"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/products",
            "file": "src/routes/products.ts",
            "description": "List all available products with filtering by category, restaurant, search query, and pagination.",
            "middleware": [],
            "responseFields": ["products", "total", "page", "totalPages"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/products/:id",
            "file": "src/routes/products.ts",
            "description": "Get a single product by ID with full details including name, description, price, category, rating.",
            "middleware": [],
            "responseFields": ["name", "description", "price", "category", "restaurantId", "imageUrl", "isAvailable", "rating", "reviewCount"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/products/restaurant/:restaurantId",
            "file": "src/routes/products.ts",
            "description": "Get all available products for a specific restaurant, sorted by category and name.",
            "middleware": [],
            "responseFields": ["name", "description", "price", "category", "restaurantId", "imageUrl", "isAvailable", "rating"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/restaurants",
            "file": "src/routes/restaurants.ts",
            "description": "List all active restaurants with filtering by cuisine type, city, search query, and pagination.",
            "middleware": [],
            "responseFields": ["restaurants", "total", "page", "totalPages"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/restaurants/:id",
            "file": "src/routes/restaurants.ts",
            "description": "Get a single restaurant by ID with full details including address, cuisine types, rating, and delivery info.",
            "middleware": [],
            "responseFields": ["name", "description", "cuisineTypes", "address", "phone", "imageUrl", "rating", "reviewCount", "isActive", "deliveryRadius", "avgDeliveryTime"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/users/profile",
            "file": "src/routes/users.ts",
            "description": "Get the authenticated user's full profile including personal info, addresses, and internal account data.",
            "middleware": ["auth"],
            "responseFields": ["id", "email", "name", "phone", "role", "avatarUrl", "addresses", "passwordHash", "lastLoginIp", "internalCreditScore", "accountFlags", "createdAt", "updatedAt"],
            "sensitiveFields": ["passwordHash", "lastLoginIp", "internalCreditScore", "accountFlags"]
        },
        {
            "method": "PUT",
            "path": "/api/users/profile",
            "file": "src/routes/users.ts",
            "description": "Update the authenticated user's profile fields (name, phone, avatar, addresses).",
            "middleware": ["auth"],
            "responseFields": ["id", "email", "name", "phone", "avatarUrl", "addresses"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/users/addresses",
            "file": "src/routes/users.ts",
            "description": "Get the authenticated user's saved delivery addresses.",
            "middleware": ["auth"],
            "responseFields": ["label", "street", "city", "state", "zip"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/admin/stats",
            "file": "src/routes/admin.ts",
            "description": "Get admin dashboard statistics including total orders, revenue, margins, user count, and restaurant count.",
            "middleware": ["auth", "admin"],
            "responseFields": ["totalOrders", "totalRevenue", "totalMargin", "totalUsers", "totalRestaurants", "avgOrderValue", "marginPercentage"],
            "sensitiveFields": ["totalRevenue", "totalMargin", "marginPercentage"]
        },
        {
            "method": "GET",
            "path": "/api/admin/users",
            "file": "src/routes/admin.ts",
            "description": "List all users in the system (admin only). Excludes password hashes.",
            "middleware": ["auth", "admin"],
            "responseFields": ["_id", "email", "name", "phone", "role", "createdAt"],
            "sensitiveFields": []
        },
        {
            "method": "PUT",
            "path": "/api/admin/users/:id/role",
            "file": "src/routes/admin.ts",
            "description": "Update a user's role (admin only). Can assign customer, admin, or restaurant_owner roles.",
            "middleware": ["auth", "admin"],
            "responseFields": ["_id", "email", "name", "role"],
            "sensitiveFields": []
        },
        {
            "method": "GET",
            "path": "/api/admin/config",
            "file": "src/routes/admin.ts",
            "description": "Get system configuration including delivery fees, margins, supported cities, and payment gateway API keys.",
            "middleware": ["auth", "admin"],
            "responseFields": ["deliveryFee", "marginPercentage", "maxOrderValue", "supportedCities", "paymentGateways", "apiKeys"],
            "sensitiveFields": ["apiKeys", "marginPercentage"]
        },
        {
            "method": "POST",
            "path": "/api/payments/charge",
            "file": "src/routes/payments.ts",
            "description": "Process a payment for an order using the specified payment method.",
            "middleware": ["auth"],
            "responseFields": ["paymentId", "status"],
            "sensitiveFields": []
        },
        {
            "method": "POST",
            "path": "/api/payments/refund",
            "file": "src/routes/payments.ts",
            "description": "Process a refund for a paid order with a reason.",
            "middleware": ["auth"],
            "responseFields": ["orderId", "refundStatus", "amount"],
            "sensitiveFields": []
        }
    ],
    "authStrategy": {
        "type": "jwt",
        "loginEndpoint": "/api/auth/login",
        "headerFormat": "Authorization: Bearer <token>"
    }
}

DEMO_SECURITY_AUDIT = {
    "auditedRoutes": [
        {
            "method": "POST",
            "path": "/api/auth/register",
            "risk": "red",
            "riskReason": "Authentication endpoint - registration should not be exposed through a public API gateway",
            "recommendation": "Never expose. Users of the platform API should authenticate through API keys, not user registration.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "POST",
            "path": "/api/auth/login",
            "risk": "red",
            "riskReason": "Authentication endpoint - login should not be exposed through a public API gateway",
            "recommendation": "Never expose. Platform consumers authenticate via API keys.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "POST",
            "path": "/api/auth/forgot-password",
            "risk": "red",
            "riskReason": "Authentication endpoint - password reset exposes security-sensitive flow and reset tokens",
            "recommendation": "Never expose through API gateway.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "GET",
            "path": "/api/orders",
            "risk": "yellow",
            "riskReason": "User-scoped read endpoint but response includes internal business metrics (internalMargin, supplierCost, deliveryPartnerPayout)",
            "recommendation": "Expose with field stripping. Remove internal business metrics from public response.",
            "fieldsToStrip": ["internalMargin", "supplierCost", "deliveryPartnerPayout"],
            "suggestedRateLimit": 100
        },
        {
            "method": "GET",
            "path": "/api/orders/:id",
            "risk": "yellow",
            "riskReason": "User-scoped read endpoint but includes internal cost data in response",
            "recommendation": "Expose with field stripping. Remove internal margin and cost fields.",
            "fieldsToStrip": ["internalMargin", "supplierCost", "deliveryPartnerPayout"],
            "suggestedRateLimit": 100
        },
        {
            "method": "POST",
            "path": "/api/orders",
            "risk": "green",
            "riskReason": "User-scoped write endpoint. Response only includes order ID, status, total, and delivery estimate. No sensitive data exposed.",
            "recommendation": "Safe to expose as-is. Apply rate limiting to prevent abuse.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 50
        },
        {
            "method": "PUT",
            "path": "/api/orders/:id/status",
            "risk": "green",
            "riskReason": "User-scoped write endpoint for updating order status. Response is minimal and non-sensitive.",
            "recommendation": "Safe to expose. Consider limiting which statuses can be set via public API.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 50
        },
        {
            "method": "GET",
            "path": "/api/products",
            "risk": "green",
            "riskReason": "Public read-only endpoint returning product catalog data. No authentication required, no sensitive data.",
            "recommendation": "Safe to expose as-is. Good candidate for public API.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 200
        },
        {
            "method": "GET",
            "path": "/api/products/:id",
            "risk": "green",
            "riskReason": "Public read-only endpoint returning single product details. No sensitive data.",
            "recommendation": "Safe to expose as-is.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 200
        },
        {
            "method": "GET",
            "path": "/api/products/restaurant/:restaurantId",
            "risk": "green",
            "riskReason": "Public read-only endpoint returning products by restaurant. No sensitive data.",
            "recommendation": "Safe to expose as-is.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 200
        },
        {
            "method": "GET",
            "path": "/api/restaurants",
            "risk": "green",
            "riskReason": "Public read-only endpoint returning restaurant listings. No sensitive data.",
            "recommendation": "Safe to expose as-is. Great candidate for public API.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 200
        },
        {
            "method": "GET",
            "path": "/api/restaurants/:id",
            "risk": "green",
            "riskReason": "Public read-only endpoint returning single restaurant details. No sensitive data.",
            "recommendation": "Safe to expose as-is.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 200
        },
        {
            "method": "GET",
            "path": "/api/users/profile",
            "risk": "yellow",
            "riskReason": "Returns user profile with sensitive fields: passwordHash, lastLoginIp, internalCreditScore, accountFlags",
            "recommendation": "Expose with field stripping. Must remove all sensitive personal and internal scoring data.",
            "fieldsToStrip": ["passwordHash", "lastLoginIp", "internalCreditScore", "accountFlags"],
            "suggestedRateLimit": 100
        },
        {
            "method": "PUT",
            "path": "/api/users/profile",
            "risk": "green",
            "riskReason": "User-scoped write endpoint. Response only includes safe profile fields.",
            "recommendation": "Safe to expose as-is with rate limiting.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 30
        },
        {
            "method": "GET",
            "path": "/api/users/addresses",
            "risk": "green",
            "riskReason": "User-scoped read endpoint returning only address data. No sensitive fields.",
            "recommendation": "Safe to expose as-is.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 100
        },
        {
            "method": "GET",
            "path": "/api/admin/stats",
            "risk": "red",
            "riskReason": "Admin-only endpoint exposing business-critical metrics: revenue, margins, user counts",
            "recommendation": "Never expose. Contains confidential business intelligence data.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "GET",
            "path": "/api/admin/users",
            "risk": "red",
            "riskReason": "Admin-only endpoint exposing all user data in the system",
            "recommendation": "Never expose. Exposes other users' personal information.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "PUT",
            "path": "/api/admin/users/:id/role",
            "risk": "red",
            "riskReason": "Admin-only endpoint that can elevate user privileges",
            "recommendation": "Never expose. Role management must remain internal.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "GET",
            "path": "/api/admin/config",
            "risk": "red",
            "riskReason": "Admin-only endpoint exposing system configuration and payment gateway API keys",
            "recommendation": "Never expose. Contains API keys and business configuration.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 0
        },
        {
            "method": "POST",
            "path": "/api/payments/charge",
            "risk": "yellow",
            "riskReason": "Payment processing endpoint. User-scoped but involves financial transactions.",
            "recommendation": "Expose with strict rate limiting. Monitor for abuse patterns.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 10
        },
        {
            "method": "POST",
            "path": "/api/payments/refund",
            "risk": "yellow",
            "riskReason": "Refund processing endpoint. User-scoped but involves financial transactions that reverse charges.",
            "recommendation": "Expose with strict rate limiting and monitoring.",
            "fieldsToStrip": [],
            "suggestedRateLimit": 5
        }
    ]
}
