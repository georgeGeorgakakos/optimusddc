# 📋 Complete Guide: Adding a New Menu Item to OptimusDDC

## 🎯 Quick Summary (Bullet Points)

When adding **ANY** new menu item, you need to:

### **Required Files to CREATE:**
- ✅ `pages/YourPage/index.tsx` - Page component wrapper
- ✅ `pages/YourPage/styles.scss` - Page-specific styles
- ✅ `components/YourComponent/index.tsx` - Main component (if reusable)
- ✅ `components/YourComponent/*.tsx` - Sub-components (if needed)
- ✅ `components/YourComponent/styles.scss` - Component styles

### **Required Files to MODIFY:**
- ✅ `config/config-default.ts` - Add to `navLinks` array
- ✅ `pages/routes/index.tsx` - Add import + route
- ✅ `templates/index.html` - Add any required CSS/JS libraries (if needed)

### **Optional Files (depending on complexity):**
- ⚪ `ducks/YourFeature/` - Redux state management (if global state needed)
- ⚪ `features/YourFeature/` - Major feature component (alternative to components/)
- ⚪ `interfaces/` - TypeScript interfaces (if complex types needed)

---

## 📁 Detailed Step-by-Step Process

### **Step 1: Create the Page Component**

**Location:** `frontend/amundsen_application/static/js/pages/YourPage/`

**Files to create:**
```
pages/YourPage/
├── index.tsx        # Page wrapper component
└── styles.scss      # Page-specific styles
```

**Template for `index.tsx`:**
```typescript
// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import DocumentTitle from 'react-document-title';

import YourComponent from 'components/YourComponent';

import './styles.scss';

export const YOUR_PAGE_TITLE = 'Your Page Title';

/**
 * Your Page Description
 *
 * What this page does and why it exists.
 */
const YourPage: React.FC = () => {
  return (
    <DocumentTitle title={`${YOUR_PAGE_TITLE} - OptimusDDC`}>
      <main className="container-fluid your-page">
        <div className="row">
          <div className="col-xs-12">
            <YourComponent />
          </div>
        </div>
      </main>
    </DocumentTitle>
  );
};

export default YourPage;
```

**Template for `styles.scss`:**
```scss
// Copyright Contributors to the OptimusDDC project.
// SPDX-License-Identifier: Apache-2.0

.your-page {
  padding: 0;
  margin: 0;
  height: 100vh;
  overflow: hidden;

  .row {
    margin: 0;
    height: 100%;
  }

  .col-xs-12 {
    padding: 0;
    height: 100%;
  }
}
```

---

### **Step 2: Create the Component (if needed)**

**Location:** `frontend/amundsen_application/static/js/components/YourComponent/`

**Files to create:**
```
components/YourComponent/
├── index.tsx              # Main component
├── SubComponent1.tsx      # Sub-components (optional)
├── SubComponent2.tsx      # Sub-components (optional)
└── YourComponent.scss     # Component styles
```

**When to use `components/` vs `features/`:**
- **components/** - Reusable UI components, smaller features
- **features/** - Major features like OptimusDDCDashboard (complex, standalone)

---

### **Step 3: Add Navigation Link**

**File:** `config/config-default.ts`

**Location in file:** Find the `navLinks` array (around line 120)

**Add this object:**
```typescript
navLinks: [
  // ... existing links ...
  {
    href: '/your-route',           // URL path
    id: 'nav::your-feature',       // Unique ID
    label: 'Your Feature',         // Display name in menu
    use_router: true,              // Use React Router (always true)
  },
],
```

**Properties explained:**
- `href` - The URL route (must match route in Step 4)
- `id` - Unique identifier (format: `nav::your-feature`)
- `label` - Text shown in navigation menu
- `use_router` - Always `true` for internal routes
- `iconOnly` - Optional, set to `true` for icon-only display (like Home)

---

### **Step 4: Add Route**

**File:** `pages/routes/index.tsx`

**Step 4a: Add import at top (around line 20):**
```typescript
import YourPage from '../YourPage';
```

**Step 4b: Add route in Switch component:**
```typescript
const AppRoutes: React.FC = () => (
  <Switch>
    {/* ... existing routes ... */}

    {/* Your new route */}
    <Route exact path="/your-route" component={YourPage} />

    {/* ... rest of routes ... */}
  </Switch>
);
```

**Route properties:**
- `exact` - Exact path match (recommended for most routes)
- `path` - URL path (must match `href` in navLinks)
- `component` - Page component to render

**Route patterns:**
- Simple: `/your-route`
- With params: `/your-route/:id`
- Nested: `/your-route/:section/:item`

---

### **Step 5: Add External Libraries (if needed)**

**File:** `templates/index.html`

**When to add:**
- Need external CSS framework (e.g., Ionicons)
- Need external JS library (e.g., Chart.js CDN)
- Need fonts or other assets

**Where to add:**
```html
<head>
  <!-- ... existing head content ... -->
  
  <!-- ✅ Add external libraries here -->
  <link href="https://example.com/library.css" rel="stylesheet">
  <script src="https://example.com/library.js"></script>
  
  <%= htmlWebpackPlugin.tags.headTags %>
</head>
```

---

### **Step 6: Add Redux State (Optional)**

**Location:** `frontend/amundsen_application/static/js/ducks/YourFeature/`

**When you need Redux:**
- Global state shared across components
- Complex state management
- Data fetching with caching
- State persistence

**Files to create:**
```
ducks/YourFeature/
├── index.ts          # Export all
├── reducer.ts        # Reducer logic
├── actions.ts        # Action creators
├── types.ts          # Action types
└── sagas.ts          # Side effects (optional)
```

**Example structure:**
```typescript
// types.ts
export enum YourFeature {
  LOAD_DATA = 'amundsen/yourFeature/LOAD_DATA',
  LOAD_DATA_SUCCESS = 'amundsen/yourFeature/LOAD_DATA_SUCCESS',
  LOAD_DATA_FAILURE = 'amundsen/yourFeature/LOAD_DATA_FAILURE',
}

// actions.ts
export interface LoadDataRequest {
  type: YourFeature.LOAD_DATA;
  payload: { id: string };
}

// reducer.ts
export interface YourFeatureState {
  data: any;
  isLoading: boolean;
  error: string | null;
}
```

**Register reducer in `ducks/rootReducer.ts`:**
```typescript
import yourFeature from './yourFeature/reducer';

const rootReducer = combineReducers({
  // ... existing reducers ...
  yourFeature,
});
```

---

### **Step 7: Build & Deploy**

```powershell
# Build frontend
cd frontend
npm run build

# Restart service
docker-compose restart catalogfrontend
# OR
kubectl rollout restart deployment/catalogfrontend -n optimusddc
```

---

## 📊 Decision Tree: Where to Put Your Code?

```
Do you need a new menu item?
│
├─ YES → Create in pages/YourPage/
│   │
│   ├─ Is it a complex standalone feature? (like Dashboard)
│   │  ├─ YES → Create in features/YourFeature/
│   │  └─ NO  → Create in components/YourComponent/
│   │
│   ├─ Does it need global state?
│   │  ├─ YES → Create in ducks/yourFeature/
│   │  └─ NO  → Use local React state (useState, useReducer)
│   │
│   └─ Add to:
│       - config/config-default.ts (navLinks)
│       - pages/routes/index.tsx (route)
│
└─ NO → Just creating a component?
    │
    ├─ Reusable UI component → components/YourComponent/
    ├─ Major feature → features/YourFeature/
    └─ Redux state → ducks/yourFeature/
```

---

## 🗂️ File Naming Conventions

### **Pages:**
- Directory: `PascalCase` (e.g., `YourPage`, `PostmanPage`)
- Files: `index.tsx`, `styles.scss`

### **Components:**
- Directory: `PascalCase` (e.g., `YourComponent`, `PostmanInterface`)
- Files: `index.tsx`, `YourComponent.scss`, `SubComponent.tsx`

### **Redux (ducks):**
- Directory: `camelCase` (e.g., `yourFeature`, `tableMetadata`)
- Files: `index.ts`, `reducer.ts`, `actions.ts`, `types.ts`, `sagas.ts`

### **Routes:**
- URL paths: `kebab-case` (e.g., `/api-testing`, `/cluster-topology`)
- Nav IDs: `nav::kebab-case` (e.g., `nav::api-testing`)

---

## ✅ Complete Checklist for New Menu Item

### **Planning Phase:**
- [ ] Decide on route path (e.g., `/your-feature`)
- [ ] Decide on menu label (e.g., "Your Feature")
- [ ] Determine if you need Redux state
- [ ] List external dependencies (libraries, APIs)

### **Implementation Phase:**
- [ ] Create `pages/YourPage/index.tsx`
- [ ] Create `pages/YourPage/styles.scss`
- [ ] Create `components/YourComponent/` (if needed)
- [ ] Create `ducks/yourFeature/` (if Redux needed)
- [ ] Add to `config/config-default.ts` → `navLinks`
- [ ] Add to `pages/routes/index.tsx` → import + route
- [ ] Add to `templates/index.html` (if external libs needed)

### **Testing Phase:**
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Menu item appears in navigation
- [ ] Route is accessible
- [ ] Component renders correctly
- [ ] External libraries load (if used)
- [ ] Redux state works (if used)

### **Deployment Phase:**
- [ ] Build succeeds
- [ ] Service restarts successfully
- [ ] Navigate to route and test functionality
- [ ] Check browser console for errors
- [ ] Test on different screen sizes (responsive)

---

## 🎯 Real Examples from Your Codebase

### **Example 1: Query Workbench (Existing)**
```
pages/QueryWorkbenchPage/
├── index.tsx
└── styles.scss

Config: navLinks → '/queryworkbench'
Route: <Route exact path="/queryworkbench" component={QueryWorkbenchPage} />
```

### **Example 2: Cluster Topology (Existing)**
```
pages/ClusterTopologyPage/
├── index.tsx
└── styles.scss

Config: navLinks → '/cluster/topology'
Route: <Route exact path="/cluster/topology" component={ClusterTopologyPage} />
```

### **Example 3: API Testing (NEW - What we're adding)**
```
pages/PostmanPage/
├── index.tsx
└── styles.scss

components/PostmanInterface/
├── index.tsx
├── RequestTree.tsx
├── RequestPanel.tsx
├── ResponsePanel.tsx
└── PostmanInterface.scss

Config: navLinks → '/api-testing'
Route: <Route exact path="/api-testing" component={PostmanPage} />
```

---

## 🔍 Common Patterns

### **Pattern 1: Simple Page (No Redux)**
```
✅ pages/YourPage/index.tsx
✅ pages/YourPage/styles.scss
✅ components/YourComponent/index.tsx
✅ config/config-default.ts (navLinks)
✅ pages/routes/index.tsx (route)
```

### **Pattern 2: Complex Page (With Redux)**
```
✅ pages/YourPage/index.tsx
✅ pages/YourPage/styles.scss
✅ features/YourFeature/index.tsx
✅ ducks/yourFeature/reducer.ts
✅ ducks/yourFeature/actions.ts
✅ ducks/yourFeature/types.ts
✅ config/config-default.ts (navLinks)
✅ pages/routes/index.tsx (route)
```

### **Pattern 3: Page with External Dependencies**
```
✅ pages/YourPage/index.tsx
✅ pages/YourPage/styles.scss
✅ components/YourComponent/index.tsx
✅ templates/index.html (CDN links)
✅ config/config-default.ts (navLinks)
✅ pages/routes/index.tsx (route)
```

---

## 📝 Summary: Minimum Required for Any Menu Item

1. **Create Page:** `pages/YourPage/` (index.tsx + styles.scss)
2. **Create Component:** `components/YourComponent/` (index.tsx + scss)
3. **Add to Config:** `config-default.ts` → `navLinks` array
4. **Add Route:** `pages/routes/index.tsx` → import + route
5. **Build & Deploy:** `npm run build` + restart service