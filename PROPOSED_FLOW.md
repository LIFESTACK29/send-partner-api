# Send Partner API: Proposed Flow & Architecture

This document outlines the revised architecture and flow for the Send Partner API. The goal is to provide a seamless integration for partners to register, manage wallets via Paystack, and schedule deliveries that are visible to Send Admins for manual assignment.

## 1. Core Objectives
- **Wallet-Based System**: Partners must have a funded wallet to schedule deliveries.
- **Paystack Integration**: Automatic creation of Paystack Dedicated Virtual Accounts (DVA) for partners.
- **Partner Dashboard**: A web portal for partners to register, login, track deliveries, and manage their wallet.
- **Admin Visibility**: Deliveries scheduled via Partner API must appear on the Send Admin dashboard.
- **Manual Assignment**: Admins can manually assign partner deliveries to riders.
- **Data Isolation**: Partner-specific metadata (API keys, settings, transaction history) resides in a separate MongoDB, while core delivery data is synced to the main Send database.
- **Simplification**: Remove all Keke-related aspects from the Partner API.

## 2. Updated Flow

### A. Partner Onboarding (Self-Service)
1. **Registration**: Partner registers via the Partner Dashboard with First Name, Last Name, Email, Phone Number, and Password.
2. **Account Creation**:
   - Partner record is created in the **Partner DB**.
   - A corresponding "Shadow User" is created in the **Main DB** (to facilitate wallet and delivery management).
3. **Wallet Provisioning**:
   - The system calls the Paystack API to create a Dedicated Virtual Account (DVA) for the partner.
   - The DVA details (Account Number, Bank Name) are shared with the partner on their dashboard.
4. **API Credentials**: Partner receives an `API_KEY` and `API_SECRET` for programmatic access.

### B. Dashboard Operations
1. **Authentication**: Partners login to the dashboard using Email and Password (JWT session).
2. **Rate Calculation**: Partners can get instant delivery rates by providing pickup and dropoff locations.
3. **Delivery Management**:
   - Schedule new deliveries directly from the dashboard.
   - View a list of all historical and active deliveries.
   - Track delivery status (PENDING, ONGOING, DELIVERED, CANCELLED).
4. **Wallet Monitoring**: View current balance and virtual account details for funding.

### C. Delivery Scheduling (Dashboard or API)
1. **Authentication**: 
   - Dashboard: Uses JWT `Bearer` token.
   - API: Uses `X-Partner-Key` header.
2. **Wallet Check**: 
   - Before scheduling, the system checks the partner's wallet balance in the **Main DB**.
   - If balance < delivery fee, the request is rejected with `INSUFFICIENT_BALANCE`.
3. **Delivery Creation**:
   - The delivery is created in the **Main DB** with a status of `PENDING`.
   - A transaction record is created in the **Partner DB** for their internal tracking.
4. **Admin Notification**: 
   - The delivery immediately appears on the **Send Admin Dashboard** under "Manual Assignment Required".
5. **Manual Assignment**:
   - Admin selects an available rider and assigns the delivery.
   - The partner receives a webhook notification (if configured) when a rider is assigned.

### C. Wallet & Payments
1. **Funding**: Partners fund their wallet by transferring to their Paystack DVA.
2. **Webhook Handling**: 
   - Paystack sends a webhook to the Main API on successful transfer.
   - Main API updates the partner's wallet balance.
3. **Deduction**: On delivery creation, the fee is deducted/held from the partner's wallet.

## 3. Architecture & Data Strategy

| Component | Database | Responsibility |
| :--- | :--- | :--- |
| **Partner API** | **Partner DB** | API Key management, Partner profiles, Webhook configs, Request logs. |
| **Main API** | **Main DB** | Delivery records, Wallets, Riders, Transactions, Admin operations. |

### Data Sync Strategy
- **Partners as Users**: Each partner has a shadow `User` record in the Main DB with a role `partner`. This allows us to use the existing Wallet and Delivery logic without major refactoring.
- **Delivery Creation**: The Partner API acts as a gateway, validating the partner's credentials and then calling internal methods (or a secure internal endpoint) of the Main API to create the delivery.

## 4. Next Steps for Implementation
1. **Database Config**: Setup multi-tenant/multi-connection support in `send-partner-api`.
2. **Registration Logic**: Update `partner.controller.ts` to create a User/Wallet in Main API upon registration.
3. **Delivery Refactor**: Update `delivery.controller.ts` to remove Keke logic and implement the "Admin Manual Assignment" flow.
4. **Wallet Integration**: Ensure `send-partner-api` can trigger DVA creation via `send-api`.
