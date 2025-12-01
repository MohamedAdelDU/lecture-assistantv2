import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, User, Bell, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, loading, signOut, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) {
      const nameParts = user.displayName?.split(" ") || [];
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setEmail(user.email || "");
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const newDisplayName = `${firstName} ${lastName}`.trim() || displayName;
      await updateUserProfile(newDisplayName || undefined);
      toast({
        title: "Success!",
        description: "Your profile has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign in to view your profile.</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">
          <nav className="flex flex-col space-y-1">
            <Button variant="secondary" className="justify-start">
              <User className="mr-2 h-4 w-4" />
              General
            </Button>
            <Button variant="ghost" className="justify-start">
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </Button>
            <Button variant="ghost" className="justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
            <Button variant="ghost" className="justify-start">
              <Shield className="mr-2 h-4 w-4" />
              Security
            </Button>
          </nav>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.displayName || "User"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>You are currently on the Pro plan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Pro Plan</span>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Unlimited lectures, advanced quizzes, and priority support.</p>
                  </div>
                  <Button variant="outline">Manage Subscription</Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="destructive" className="w-full md:w-auto" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
