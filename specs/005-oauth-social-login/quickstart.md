# Quickstart: Microsoft & Google Social Login

This developer quickstart guides you through running, testing, and validating the Microsoft & Google client-side Social Login feature.

## Prerequisites

1. Local development server running (`npm run dev`).
2. Optional: Standard OAuth Client Credentials to test real provider logins. If credentials are not present in `.env.local`, the system automatically activates the interactive **OAuth Mock Simulator** for easy local development.

### Optional Environment Variables (`.env.local`)
Create or update your `.env.local` with the following variables if you have registered clients:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your-azure-app-client-id
```

---

## Interactive OAuth Mock Simulator

To make local development, offline design, and testing seamless, the buttons on the workspace access panel run in **Mock Simulator Mode** by default.

1. **Popup Experience**: When you click "Google" or "Microsoft", the application detects the absence of client IDs and opens a beautifully styled, local simulation popup window.
2. **User Accounts Available**:
   - **Google Mock Profiles**:
     - *Duy VT* (`duyvt@fpt.com`, Avatar: Standard FPT icon)
     - *Google Developer* (`dev.google@gmail.com`, Avatar: standard Google G)
   - **Microsoft Mock Profiles**:
     - *Duy VT* (`duyvt7@fsoft.com.vn`, Avatar: standard MS logo)
     - *Microsoft Consultant* (`consultant@microsoft.com`, Avatar: standard MS logo)
3. **Flow Simulation**:
   - Clicking on a profile in the simulated window will fire a successful OAuth Callback parameter payload containing a mock access token and `expires_in` value.
   - Clicking "Cancel" or closing the mock window simulates an OAuth rejection, returning a cancelled callback action.

---

## Manual Validation Scenarios

### Scenario 1 — Sign in with Google (US1 - Mock Mode)
1. Navigate to the login page (ensure you are signed out).
2. Click the **Google** button.
3. Observe that a clean, modeled popup window opens representing Google's consent screen.
4. Select the profile **Duy VT** (`duyvt@fpt.com`).
5. **Expected Outcome**:
   - The popup closes.
   - A success toast is displayed: *"Signed in via Google as Duy VT."*
   - You are redirected instantly to the `/query-input` workspace.
   - The Sidebar or profile indicator displays the Google logo alongside *"Duy VT"*.

### Scenario 2 — Sign in with Microsoft (US2 - Mock Mode)
1. Sign out of any active session to return to the sign-in screen.
2. Click the **Microsoft** button.
3. Select **Duy VT** (`duyvt7@fsoft.com.vn`).
4. **Expected Outcome**:
   - The popup closes.
   - A success toast is displayed: *"Signed in via Microsoft as Duy VT."*
   - You land on the `/query-input` page with the Microsoft identity profile visible.

### Scenario 3 — Flow Cancellation / Consent Rejection (Edge Cases)
1. Click either **Google** or **Microsoft** button.
2. In the mock popup window, click the **Cancel / Deny Access** button (or close the popup window manually).
3. **Expected Outcome**:
   - The popup closes.
   - You remain unauthenticated on the login screen.
   - No crash occurs.
   - A localized warning toast is displayed: *"Authentication cancelled or rejected by the provider."*

### Scenario 4 — Session Persistence (US3)
1. Successfully sign in using either Google or Microsoft.
2. Hard reload the page (`F5` or `Ctrl + F5`) or close the tab and reopen `http://localhost:3000/query-input`.
3. **Expected Outcome**:
   - You remain authenticated and stay on the `/query-input` page.
   - No redirect to the login page occurs.
   - Profile information remains exactly as it was.

### Scenario 5 — Session Expiration (US3 - Edge Case)
1. Open the browser's developer tools (`F12`) and go to the **Application** -> **Local Storage** tab.
2. Find the key `sqlvisualizer-user-session`.
3. Manually edit the JSON string to set the `expiry` timestamp to a value in the past (e.g., `1000` - representing year 1970).
4. Reload the page.
5. **Expected Outcome**:
   - The application detects the expired session.
   - The expired session is automatically wiped from local storage.
   - You are redirected back to the login page.
   - A warning toast is shown: *"Session expired. Please sign in again."*

### Scenario 6 — Explicit Sign-out (US3)
1. While authenticated via a social provider, click the **Sign out** button on the Sidebar.
2. **Expected Outcome**:
   - You are instantly redirected to the login panel.
   - Local storage keys `sqlvisualizer-user-session` and `sqlvisualizer-demo-authenticated` are completely removed.
   - Attempting to manually navigate to `/query-input` redirects you back to the login screen.

---

## Automated Checks

To run the automated tests verifying code correctness, run:

```bash
# Run the specific vitest suite for authentication
npx vitest run src/lib/demoAuth.test.ts

# Run typescript compilation to verify type safety
npx tsc --noEmit
```
