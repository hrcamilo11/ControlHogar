import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/providers/AuthProvider'

export default function FinanceTab() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')

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

  const { data: expenses } = useQuery({
    queryKey: ['expenses', homeId],
    enabled: !!homeId,
    queryFn: async () => {
      const { data } = await supabase
        .from('expenses')
        .select('id, title, amount, created_at, profiles:paid_by(display_name)')
        .eq('home_id', homeId!)
        .order('created_at', { ascending: false })
        .limit(20)
      return data ?? []
    },
  })

  const handleAdd = async () => {
    if (!title.trim() || !amount || !homeId) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) { Alert.alert('Error', 'Monto inválido'); return }

    const { error } = await supabase.from('expenses').insert({
      home_id: homeId,
      title: title.trim(),
      amount: numAmount,
      paid_by: session!.user.id,
      split_type: 'equal',
    })

    if (error) Alert.alert('Error', error.message)
    else {
      // Auto-create equal splits for all members
      const { data: members } = await supabase.from('home_members').select('user_id').eq('home_id', homeId)
      if (members && members.length > 0) {
        const splitAmount = numAmount / members.length
        const { data: exp } = await supabase.from('expenses').select('id').eq('home_id', homeId).eq('title', title.trim()).order('created_at', { ascending: false }).limit(1).single()
        if (exp) {
          await supabase.from('expense_splits').insert(
            members.map((m) => ({ expense_id: exp.id, user_id: m.user_id, amount: splitAmount }))
          )
        }
      }
      setTitle('')
      setAmount('')
      setShowAdd(false)
      queryClient.invalidateQueries({ queryKey: ['expenses', homeId] })
    }
  }

  return (
    <View style={styles.container}>
      {/* Add expense */}
      {showAdd ? (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Descripción" value={title} onChangeText={setTitle} autoFocus />
          <TextInput style={styles.input} placeholder="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>Registrar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Nuevo gasto</Text>
        </TouchableOpacity>
      )}

      {/* Expenses list */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {(item.profiles as any)?.display_name} · {new Date(item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  form: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 },
  input: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 10 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  submitBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  cancelText: { color: '#6b7280', fontSize: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '500', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 },
})
