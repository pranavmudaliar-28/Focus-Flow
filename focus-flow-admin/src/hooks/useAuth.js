import { useState, useEffect, createContext, useContext, createElement } from 'react'
import { auth, db, onAuthStateChanged, doc, getDoc, updateDoc, collection, query, where, getDocs } from '@/lib/firebase'
import { generateOrgCode } from '@/lib/utils'
import { getSubStatus } from '@/lib/stripe'

const AuthContext = createContext(null)

async function fetchOrg(uid) {
  const q = query(collection(db, 'organisations'), where('adminUid', '==', uid))
  let snap = await getDocs(q)

  // Retry once after 1.5 s — handles race condition where signup just wrote the org doc
  if (snap.empty) {
    await new Promise(r => setTimeout(r, 1500))
    snap = await getDocs(q)
  }

  if (snap.empty) return null

  const orgDoc = snap.docs[0]
  const orgData = { id: orgDoc.id, ...orgDoc.data() }

  // Auto-patch missing orgCode
  if (!orgData.orgCode) {
    const newCode = generateOrgCode()
    await updateDoc(doc(db, 'organisations', orgDoc.id), { orgCode: newCode })
    orgData.orgCode = newCode
  }

  return orgData
}

async function fetchOrgById(orgId) {
  const snap = await getDoc(doc(db, 'organisations', orgId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [org, setOrg] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'admin' | 'manager' | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true)
        setUser(firebaseUser)
        try {
          // Check if they are an org admin first
          const orgData = await fetchOrg(firebaseUser.uid)
          if (orgData) {
            setOrg(orgData)
            setUserRole('admin')
          } else {
            // Check userOrgMap for all roles (manager, employee, etc.)
            const mapSnap = await getDoc(doc(db, 'userOrgMap', firebaseUser.uid))
            if (mapSnap.exists()) {
              const { role, orgId } = mapSnap.data()
              if (role === 'manager') {
                const managerOrg = await fetchOrgById(orgId)
                setOrg(managerOrg)
                setUserRole('manager')
              } else {
                // employee or any other non-admin role — no admin panel access
                setOrg(null)
                setUserRole('employee')
              }
            } else {
              setOrg(null)
              setUserRole(null) // brand-new user, no org yet
            }
          }
        } catch (err) {
          console.error('[useAuth] org query failed:', err.code || err.message)
          setOrg(null)
          setUserRole(null)
        }
      } else {
        setUser(null)
        setOrg(null)
        setUserRole(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const subStatus = getSubStatus(org)

  // Derive admin from the org itself so a freshly-created org (set via setOrg before
  // onAuthStateChanged re-resolves) is recognised as admin immediately.
  let effectiveRole = userRole
  if (org && user && org.adminUid === user.uid) effectiveRole = 'admin'

  return createElement(AuthContext.Provider, { value: { user, org, setOrg, userRole: effectiveRole, subStatus, loading } }, children)
}

export function useAuth() {
  return useContext(AuthContext)
}
