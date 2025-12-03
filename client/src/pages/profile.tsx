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
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, loading, signOut, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const { language, isRTL } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const t = {
    title: language === "ar" ? "الملف الشخصي والإعدادات" : "Profile & Settings",
    subtitle: language === "ar" ? "إدارة إعدادات حسابك وتفضيلاتك." : "Manage your account settings and preferences.",
    general: language === "ar" ? "عام" : "General",
    billing: language === "ar" ? "الفوترة" : "Billing",
    notifications: language === "ar" ? "الإشعارات" : "Notifications",
    security: language === "ar" ? "الأمان" : "Security",
    profileInfo: language === "ar" ? "معلومات الملف الشخصي" : "Profile Information",
    profileDesc: language === "ar" ? "قم بتحديث بياناتك الشخصية." : "Update your personal details.",
    firstName: language === "ar" ? "الاسم الأول" : "First name",
    lastName: language === "ar" ? "اسم العائلة" : "Last name",
    email: language === "ar" ? "البريد الإلكتروني" : "Email",
    emailCannotChange: language === "ar" ? "لا يمكن تغيير البريد الإلكتروني" : "Email cannot be changed",
    saving: language === "ar" ? "جاري الحفظ..." : "Saving...",
    saveChanges: language === "ar" ? "حفظ التغييرات" : "Save Changes",
    subscriptionPlan: language === "ar" ? "خطة الاشتراك" : "Subscription Plan",
    proPlanDesc: language === "ar" ? "أنت حالياً على الخطة الاحترافية." : "You are currently on the Pro plan.",
    proPlan: language === "ar" ? "الخطة الاحترافية" : "Pro Plan",
    active: language === "ar" ? "نشط" : "Active",
    proPlanFeatures: language === "ar" ? "محاضرات غير محدودة، اختبارات متقدمة، ودعم ذو أولوية." : "Unlimited lectures, advanced quizzes, and priority support.",
    manageSubscription: language === "ar" ? "إدارة الاشتراك" : "Manage Subscription",
    signOut: language === "ar" ? "تسجيل الخروج" : "Sign Out",
    loading: language === "ar" ? "جاري التحميل..." : "Loading...",
    pleaseSignIn: language === "ar" ? "يرجى تسجيل الدخول لعرض ملفك الشخصي." : "Please sign in to view your profile.",
    success: language === "ar" ? "نجح!" : "Success!",
    profileUpdated: language === "ar" ? "تم تحديث ملفك الشخصي." : "Your profile has been updated.",
    error: language === "ar" ? "خطأ" : "Error",
    updateFailed: language === "ar" ? "فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى." : "Failed to update profile. Please try again.",
    signedOut: language === "ar" ? "تم تسجيل الخروج" : "Signed out",
    signedOutDesc: language === "ar" ? "تم تسجيل خروجك بنجاح." : "You've been signed out successfully.",
    signOutFailed: language === "ar" ? "فشل تسجيل الخروج. يرجى المحاولة مرة أخرى." : "Failed to sign out. Please try again.",
    user: language === "ar" ? "مستخدم" : "User",
  };

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
        title: t.success,
        description: t.profileUpdated,
      });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || t.updateFailed,
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
        title: t.signedOut,
        description: t.signedOutDesc,
      });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || t.signOutFailed,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t.loading}</div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t.pleaseSignIn}</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">
          <nav className="flex flex-col space-y-1">
            <Button variant="secondary" className={cn("justify-start", isRTL && "flex-row-reverse")}>
              <User className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.general}
            </Button>
            <Button variant="ghost" className={cn("justify-start", isRTL && "flex-row-reverse")}>
              <CreditCard className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.billing}
            </Button>
            <Button variant="ghost" className={cn("justify-start", isRTL && "flex-row-reverse")}>
              <Bell className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.notifications}
            </Button>
            <Button variant="ghost" className={cn("justify-start", isRTL && "flex-row-reverse")}>
              <Shield className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.security}
            </Button>
          </nav>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.profileInfo}</CardTitle>
                <CardDescription>{t.profileDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.displayName || t.user}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.firstName}</Label>
                    <Input 
                      id="firstName" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.lastName}</Label>
                    <Input 
                      id="lastName" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      dir={isRTL ? "rtl" : "ltr"}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t.email}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    disabled
                    className="bg-muted"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">{t.emailCannotChange}</p>
                </div>

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t.saving : t.saveChanges}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.subscriptionPlan}</CardTitle>
                <CardDescription>{t.proPlanDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("flex items-center justify-between p-4 border rounded-lg bg-secondary/10", isRTL && "flex-row-reverse")}>
                  <div className="space-y-1">
                    <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                      <span className="font-semibold">{t.proPlan}</span>
                      <Badge>{t.active}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.proPlanFeatures}</p>
                  </div>
                  <Button variant="outline">{t.manageSubscription}</Button>
                </div>
              </CardContent>
            </Card>

            <div className={cn("flex", isRTL ? "justify-start" : "justify-end")}>
              <Button variant="destructive" className="w-full md:w-auto" onClick={handleSignOut}>
                  <LogOut className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                  {t.signOut}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
