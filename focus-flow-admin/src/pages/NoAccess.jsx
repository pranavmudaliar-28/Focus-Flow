import { Zap, Globe, LogOut, ShieldOff } from 'lucide-react'
import { auth, signOut } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NoAccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-60 w-60 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Focus Flow</h1>
        </div>

        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <ShieldOff className="h-6 w-6 text-destructive" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground">Admin access only</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                This panel is for organisation admins and managers only.
                As a team member, please use the{' '}
                <strong className="text-foreground">Focus Flow Chrome extension</strong>{' '}
                to access your workspace.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                className="w-full gap-2"
                onClick={() => window.open('https://chromewebstore.google.com/search/Focus%20Flow%20Smart%20Deep%20Work%20Timer', '_blank')}
              >
                <Globe className="h-4 w-4" />
                Open Chrome Extension
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => signOut(auth)}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If you should have admin or manager access, ask your org admin to update your role in the Team page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
