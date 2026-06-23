'use server'

import { createAuthClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    redirect('/login?erro=credenciais')
  }

  redirect('/')
}

export async function logoutAction() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  redirect('/login')
}
