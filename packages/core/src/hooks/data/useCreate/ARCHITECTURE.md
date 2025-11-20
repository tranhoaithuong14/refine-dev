# Kiến trúc và Design Patterns của useCreate Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### Core CRUD Hook - CREATE Operation

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE DATA LAYER                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CRUD Operations:                                       │
│  ✅ useCreate ──→ POST /resource (THIS HOOK)            │
│  □  useUpdate ──→ PUT /resource/:id                     │
│  □  useDelete ──→ DELETE /resource/:id                  │
│  □  useList ───→ GET /resource                          │
│  □  useOne ────→ GET /resource/:id                      │
└─────────────────────────────────────────────────────────┘
```

## 2. DESIGN PATTERNS

### 2.1 Command Pattern

Execute create operations with automatic side effects (notifications, cache invalidation, logging).

### 2.2 Observer Pattern

Publishes "created" events for realtime subscribers.

### 2.3 Template Method Pattern

Standardized flow: validate → call API → success/error callbacks → side effects.

### 2.4 Multi-Layer Error Handling

- Layer 1: Auth errors (401/403) → logout/redirect
- Layer 2: Notification → show toast
- Layer 3: Custom callback → user handler

### 2.5 Optimistic Updates (Optional)

Update UI immediately, rollback if API fails.

## 3. KEY FEATURES

1. **Auto Notification** - Success/error toasts
2. **Cache Invalidation** - Auto refetch list/many queries
3. **Realtime Events** - Publish "created" event
4. **Audit Logging** - Track who created what
5. **i18n Support** - Translated messages
6. **Loading Overtime** - Track slow requests

## 4. USAGE

```typescript
const { mutate, isPending } = useCreate();

mutate({
  resource: "posts",
  values: { title: "New Post", content: "Hello" },
});
```

## 5. SEE ALSO

- In-line documentation: `/hooks/data/useCreate.ts` (1,601 lines)
- React Query: useMutation
- Refine Docs: https://refine.dev/docs/api-reference/core/hooks/data/useCreate
