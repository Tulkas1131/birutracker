
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const firestore = db();
    const authInstance = auth();

    try {
      // 1. Check if email is in the allowed list
      const allowedEmailsRef = collection(firestore, "allowed_emails");
      const q = query(allowedEmailsRef, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: "Acceso no Autorizado",
          description: "Esta dirección de correo no tiene permiso para registrarse.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      const role = "Operador";

      // 2. If allowed, create user
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;

      // 3. Create user profile in 'users' collection with the determined role
      await setDoc(doc(firestore, "users", user.uid), {
        email: user.email,
        role: role,
      });

      toast({
        title: "¡Cuenta Creada!",
        description: `Bienvenido. Has sido registrado como ${role}.`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: "Error de Registro",
          description: "Este correo ya está registrado. Por favor, inicia sesión.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error de Registro",
          description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 h-12 w-12" />
          <CardTitle className="text-2xl">Crear una cuenta</CardTitle>
          <CardDescription>Ingresa tu información para crear una cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@ejemplo.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                 {isLoading ? <Loader2 className="animate-spin" /> : 'Crear Cuenta'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/" className="underline">
              Inicia Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
