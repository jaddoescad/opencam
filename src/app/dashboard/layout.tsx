import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies!profiles_company_id_fkey(*)')
    .eq('id', user.id)
    .single()

  const company = profile?.company || null

  return <DashboardShell user={profile} company={company}>{children}</DashboardShell>
}
