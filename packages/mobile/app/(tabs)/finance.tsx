import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

type SplitType = 'equal' | 'percentage' | 'custom'

export default function FinanceTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: homes } = useQuery({
    queryKey: ['homes'],
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('homes(id, name, currency)').eq('user_id', session!.user.id)
      return data?.map((r: any) => r.homes).filter(Boolean) ?? []
    },
    enabled: !!session,
  })

  const homeId = homes?.[0]?.id
  const currency = homes?.[0]?.currency ?? 'COP'

  const { data: members } = useQuery({
    queryKey: ['home-members', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('home_members').select('user_id, profiles(display_name)').eq('home_id', homeId!)
      return (data ?? []).map((m: any) => ({ user_id: m.user_id, name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.display_name ?? '?' }))
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase.from('expense_categories').select('id, name').or(`home_id.is.null,home_id.eq.${homeId}`).order('name')
      return data ?? []
    },
  })

  const { data: expenses } = useQuery({
    queryKey: ['expenses', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('id, title, amount, created_at, profiles:paid_by(display_name), expense_categories(name)')
        .eq('home_id', homeId!)
        .order('created_at', { ascending: false })
        .limit(30)
      return data ?? []
    },
  })

  if (showAdd && homeId) {
    return (
      <CreateExpenseForm
        homeId={homeId}
        members={members ?? []}
        categories={categories ?? []}
        userId={session!.user.id}
        currency={currency}
        onCreated={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ['expenses', homeId] }) }}
        onCancel={() => setShowAdd(false)}
      />
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ Nuevo gasto</Text>
      </TouchableOpacity>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {(item.profiles as any)?.display_name} · {(item.expense_categories as any)?.name ?? 'Sin categoría'} · {new Date(item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={styles.cardAmount}>${Number(item.amount).toLocaleString('es-CO')}</Text>
          </View>
        )}
        contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>Sin gastos registrados</Text>}
      />
    </View>
  )
}

function CreateExpenseForm({ homeId, members, categories, userId, currency, onCreated, onCancel }: {
  homeId: string; members: { user_id: string; name: string }[]; categories: { id: string; name: string }[]
  userId: string; currency: string; onCreated: () => void; onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [paidBy, setPaidBy] = useState(userId)
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [participants, setParticipants] = useState<string[]>(members.map((m) => m.user_id))
  const [isLoading, setIsLoading] = useState(false)

  const { data: homeTasks } = useQuery({
    queryKey: ['tasks-for-expense', homeId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('id, title').eq('home_id', homeId).eq('is_active', true).order('title').limit(20)
      return data ?? []
    },
  })

  const toggleParticipant = (uid: string) => {
    setParticipants((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])
  }

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Error', 'La descripción es obligatoria'); return }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) { Alert.alert('Error', 'Monto inválido'); return }
    if (participants.length < 1) { Alert.alert('Error', 'Selecciona al menos un participante'); return }

    setIsLoading(true)

    const { data: expense, error } = await supabase.from('expenses').insert({
      home_id: homeId,
      title: title.trim(),
      description: description.trim() || null,
      amount: numAmount,
      paid_by: paidBy,
      split_type: splitType,
      category_id: categoryId || null,
      task_id: taskId || null,
    }).select().single()

    if (error) { Alert.alert('Error', error.message); setIsLoading(false); return }

    // Create splits
    if (expense) {
      const splitAmount = numAmount / participants.length
      await supabase.from('expense_splits').insert(
        participants.map((uid) => ({ expense_id: expense.id, user_id: uid, amount: splitAmount }))
      )
    }

    setIsLoading(false)
    onCreated()
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.formTitle}>Nuevo gasto</Text>

        {/* Title */}
        <Text style={styles.label}>Descripción</Text>
        <TextInput style={styles.input} placeholder="¿En qué se gastó?" value={title} onChangeText={setTitle} maxLength={200} />

        {/* Amount */}
        <Text style={styles.label}>Monto ({currency})</Text>
        <TextInput style={styles.input} placeholder="0" value={amount} onChangeText={setAmount} keyboardType="numeric" />

        {/* Description */}
        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Detalles..." value={description} onChangeText={setDescription} multiline maxLength={500} />

        {/* Category */}
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity onPress={() => setCategoryId('')} style={[styles.chip, !categoryId && styles.chipActive]}>
            <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>Ninguna</Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.chip, categoryId === c.id && styles.chipActive]}>
              <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Paid by */}
        <Text style={styles.label}>¿Quién pagó?</Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <TouchableOpacity key={m.user_id} onPress={() => setPaidBy(m.user_id)} style={[styles.chip, paidBy === m.user_id && styles.chipActive]}>
              <Text style={[styles.chipText, paidBy === m.user_id && styles.chipTextActive]}>{m.name}{m.user_id === userId ? ' (yo)' : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Associate with task */}
        {homeTasks && homeTasks.length > 0 && (
          <>
            <Text style={styles.label}>Asociar a actividad (opcional)</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity onPress={() => setTaskId('')} style={[styles.chip, !taskId && styles.chipActive]}>
                <Text style={[styles.chipText, !taskId && styles.chipTextActive]}>Ninguna</Text>
              </TouchableOpacity>
              {homeTasks.map((t) => (
                <TouchableOpacity key={t.id} onPress={() => setTaskId(t.id)} style={[styles.chip, taskId === t.id && styles.chipActive]}>
                  <Text style={[styles.chipText, taskId === t.id && styles.chipTextActive]} numberOfLines={1}>{t.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Split type */}
        <Text style={styles.label}>División</Text>
        <View style={styles.chipRow}>
          {([{ key: 'equal', label: 'Equitativo' }, { key: 'percentage', label: 'Porcentaje' }, { key: 'custom', label: 'Personalizado' }] as const).map(({ key, label }) => (
            <TouchableOpacity key={key} onPress={() => setSplitType(key)} style={[styles.chip, splitType === key && styles.chipActive]}>
              <Text style={[styles.chipText, splitType === key && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Participants */}
        <Text style={styles.label}>Dividir entre</Text>
        <View style={styles.chipRow}>
          {members.map((m) => (
            <TouchableOpacity key={m.user_id} onPress={() => toggleParticipant(m.user_id)} style={[styles.chip, participants.includes(m.user_id) && styles.chipActive]}>
              <Text style={[styles.chipText, participants.includes(m.user_id) && styles.chipTextActive]}>
                {participants.includes(m.user_id) ? '✓ ' : ''}{m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.formActions}>
          <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isLoading}>
            <Text style={styles.submitBtnText}>{isLoading ? 'Registrando...' : 'Registrar gasto'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  // Form styles
  formContainer: { flex: 1, backgroundColor: '#f9fafb' },
  formContent: { padding: 20, paddingBottom: 40 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextActive: { color: '#ffffff' },
  formActions: { gap: 12, marginTop: 8 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#6b7280', fontSize: 15 },
})
