import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, User, Bell, Shield, LogOut } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
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
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Button variant="outline">Change Avatar</Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" defaultValue="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" defaultValue="Doe" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>

                <Button>Save Changes</Button>
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
              <Link href="/sign-in">
                <Button variant="destructive" className="w-full md:w-auto">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
