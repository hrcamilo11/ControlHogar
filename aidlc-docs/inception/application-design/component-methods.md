# Métodos de Componentes — ControlHogar

Firmas de métodos principales por módulo. Los detalles de lógica de negocio (reglas, validaciones, cálculos) se definen en Functional Design.

---

## Módulo Auth

```typescript
// auth.service.ts
signUp(email: string, password: string): Promise<AuthResult>
signInWithEmail(email: string, password: string): Promise<AuthResult>
signInWithOAuth(provider: 'google' | 'apple'): Promise<AuthResult>
signOut(): Promise<void>
getSession(): Session | null
onAuthStateChange(callback: (session: Session | null) => void): Unsubscribe
resetPassword(email: string): Promise<void>
updatePassword(newPassword: string): Promise<void>
enableMFA(): Promise<MFASetupResult>
verifyMFA(code: string): Promise<AuthResult>
```

---

## Módulo Homes

```typescript
// homes.service.ts
createHome(data: CreateHomeInput): Promise<Home>
getHome(homeId: string): Promise<Home>
getUserHomes(): Promise<Home[]>
updateHome(homeId: string, data: UpdateHomeInput): Promise<Home>
deleteHome(homeId: string): Promise<void>
setActiveHome(homeId: string): void
getActiveHome(): Home | null

// members.service.ts
getMembers(homeId: string): Promise<Member[]>
updateMemberRole(homeId: string, userId: string, role: Role): Promise<Member>
removeMember(homeId: string, userId: string): Promise<void>

// invitations.service.ts
createInvitation(homeId: string, data: CreateInvitationInput): Promise<Invitation>
getInvitations(homeId: string): Promise<Invitation[]>
acceptInvitation(token: string): Promise<Home>
revokeInvitation(invitationId: string): Promise<void>
```

---

## Módulo Tasks

```typescript
// tasks.service.ts
createTask(homeId: string, data: CreateTaskInput): Promise<Task>
getTask(taskId: string): Promise<Task>
getTasks(homeId: string, filters?: TaskFilters): Promise<Task[]>
getMyTasks(homeId: string): Promise<Task[]>
updateTask(taskId: string, data: UpdateTaskInput): Promise<Task>
deleteTask(taskId: string): Promise<void>
assignTask(taskId: string, userIds: string[]): Promise<Task>
completeTask(taskId: string): Promise<TaskCompletion>
getTaskHistory(homeId: string, filters?: HistoryFilters): Promise<TaskCompletion[]>
```

**Tipos principales:**
```typescript
interface CreateTaskInput {
  title: string
  description?: string
  frequency: TaskFrequency
  assigneeIds?: string[]
  dueDate?: Date
}

type TaskFrequency = 
  | { type: 'once' }
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number }
  | { type: 'biweekly'; dayOfWeek: number }
  | { type: 'monthly'; dayOfMonth: number }
  | { type: 'custom'; intervalDays: number }
```

---

## Módulo Finance

```typescript
// expenses.service.ts
createExpense(homeId: string, data: CreateExpenseInput): Promise<Expense>
getExpenses(homeId: string, filters?: ExpenseFilters): Promise<Expense[]>
updateExpense(expenseId: string, data: UpdateExpenseInput): Promise<Expense>
deleteExpense(expenseId: string): Promise<void>
attachReceipt(expenseId: string, file: File): Promise<string>

// recurring-payments.service.ts
createRecurringPayment(homeId: string, data: CreateRecurringPaymentInput): Promise<RecurringPayment>
getRecurringPayments(homeId: string): Promise<RecurringPayment[]>
markAsPaid(paymentId: string, paidBy: string): Promise<RecurringPayment>
updateRecurringPayment(paymentId: string, data: UpdateRecurringPaymentInput): Promise<RecurringPayment>
deleteRecurringPayment(paymentId: string): Promise<void>

// balance.service.ts
getBalance(homeId: string): Promise<MemberBalance[]>
getBalanceDetail(homeId: string, userId: string): Promise<BalanceDetail>
settleDebt(homeId: string, fromUserId: string, toUserId: string, amount: number): Promise<Settlement>

// budget.service.ts
setBudget(homeId: string, data: SetBudgetInput): Promise<Budget>
getBudget(homeId: string, month: string): Promise<Budget>
getBudgetStatus(homeId: string, month: string): Promise<BudgetStatus>

// shopping-list.service.ts
addShoppingItem(homeId: string, data: CreateShoppingItemInput): Promise<ShoppingItem>
getShoppingList(homeId: string): Promise<ShoppingItem[]>
markAsBought(itemId: string, expenseData?: CreateExpenseInput): Promise<ShoppingItem>
removeShoppingItem(itemId: string): Promise<void>
```

---

## Módulo Maintenance

```typescript
// maintenance.service.ts
createMaintenance(homeId: string, data: CreateMaintenanceInput): Promise<Maintenance>
getMaintenance(maintenanceId: string): Promise<Maintenance>
getMaintenanceList(homeId: string, filters?: MaintenanceFilters): Promise<Maintenance[]>
updateMaintenance(maintenanceId: string, data: UpdateMaintenanceInput): Promise<Maintenance>
deleteMaintenance(maintenanceId: string): Promise<void>
updateStatus(maintenanceId: string, status: MaintenanceStatus): Promise<Maintenance>
addNote(maintenanceId: string, note: string): Promise<MaintenanceNote>
addPhoto(maintenanceId: string, file: File): Promise<string>
getMaintenanceHistory(homeId: string): Promise<Maintenance[]>
```

---

## Módulo Sync

```typescript
// sync.service.ts
initialize(userId: string): Promise<void>
getConnectionStatus(): ConnectionStatus
onConnectionChange(callback: (status: ConnectionStatus) => void): Unsubscribe
getPendingChangesCount(): number
forcSync(): Promise<SyncResult>
resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>
getPendingConflicts(): Promise<Conflict[]>
```

---

## Módulo Notifications

```typescript
// notifications.service.ts
getNotifications(userId: string, filters?: NotificationFilters): Promise<AppNotification[]>
getUnreadCount(userId: string): Promise<number>
markAsRead(notificationId: string): Promise<void>
markAllAsRead(userId: string): Promise<void>

// notification-preferences.service.ts
getPreferences(userId: string): Promise<NotificationPreferences>
updatePreferences(userId: string, data: UpdatePreferencesInput): Promise<NotificationPreferences>

// push.service.ts (interno)
registerDevice(userId: string, token: string, platform: Platform): Promise<void>
unregisterDevice(deviceId: string): Promise<void>
sendPush(userId: string, notification: PushPayload): Promise<void>

// email.service.ts (Edge Function)
sendEmail(to: string, template: EmailTemplate, data: Record<string, unknown>): Promise<void>
```
