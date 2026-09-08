'use client';

import { type SyntheticEvent, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LoginScreenProps = {
  onAuthenticated: (name: string) => void;
};

type FormMessage = {
  kind: 'error' | 'info';
  text: string;
} | null;

const SESSION_KEY = 'mantis-demo-session';

function readText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<FormMessage>(null);
  const [loading, setLoading] = useState(false);

  function openSession(name: string, email: string) {
    const session = { name, email, createdAt: new Date().toISOString() };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.setTimeout(() => onAuthenticated(name), 420);
  }

  function handleLogin(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = readText(data, 'email').trim();
    const password = readText(data, 'password');

    if (!email.includes('@') || password.length < 6) {
      setMessage({ kind: 'error', text: 'Escribe un correo válido y una contraseña de al menos 6 caracteres.' });
      return;
    }

    setMessage({ kind: 'info', text: 'Acceso correcto. Preparando tu centro de operaciones…' });
    setLoading(true);
    openSession('Gabo', email);
  }

  function handleRegister(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = readText(data, 'name').trim();
    const email = readText(data, 'register-email').trim();
    const password = readText(data, 'register-password');
    const accepted = data.get('terms') === 'on';

    if (name.length < 2 || !email.includes('@') || password.length < 6 || !accepted) {
      setMessage({ kind: 'error', text: 'Completa tus datos, usa 6 caracteres o más y acepta el uso de la demo.' });
      return;
    }

    setMessage({ kind: 'info', text: 'Espacio creado. Configurando tu primera experiencia…' });
    setLoading(true);
    openSession(name, email);
  }

  function enterDemo() {
    setMessage({ kind: 'info', text: 'Cargando el laboratorio de demostración…' });
    setLoading(true);
    openSession('Gabo', 'gabo@mantis.demo');
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Presentación de Mantis IA">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="auth-grid" aria-hidden="true" />

        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true"><span>M</span><i /></div>
          <div><strong>Mantis IA</strong><span>Maintenance intelligence system</span></div>
        </div>

        <div className="auth-story-copy">
          <p className="auth-kicker"><Sparkles /> INGENIERÍA + INTELIGENCIA ARTIFICIAL</p>
          <h1>Las máquinas hablan.<br /><em>Mantis las interpreta.</em></h1>
          <p>Convierte horas de uso, historial y señales de mantenimiento en prioridades claras para actuar antes de que el problema crezca.</p>
        </div>

        <div className="auth-signal-card">
          <div className="signal-top"><span><i /> ANÁLISIS ACTIVO</span><small>COMP-01</small></div>
          <div className="signal-body">
            <div className="signal-score"><span>62</span><small>condición</small></div>
            <div><strong>Riesgo detectado</strong><p>Servicio preventivo vencido por 47 horas.</p></div>
            <Bot aria-hidden="true" />
          </div>
          <div className="signal-track"><span /></div>
        </div>

        <div className="auth-capabilities" aria-label="Capacidades principales">
          <span><Gauge /> Estado en tiempo real</span>
          <span><Wrench /> Plan preventivo</span>
          <span><ShieldCheck /> Decisiones trazables</span>
        </div>
      </section>

      <section className="auth-entry">
        <div className="auth-mobile-brand">
          <div className="auth-brand-mark" aria-hidden="true"><span>M</span><i /></div>
          <strong>Mantis IA</strong>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-version">PROTOTIPO · FERIA USTA 2026</span>
            <h2>Bienvenido a tu centro de operaciones.</h2>
            <p>Accede para revisar la condición de tus máquinas y priorizar el mantenimiento.</p>
          </div>

          <Tabs defaultValue="login" onValueChange={() => setMessage(null)} className="auth-tabs">
            <TabsList className="auth-tabs-list">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="auth-tab-content">
              <form onSubmit={handleLogin} noValidate>
                <label className="auth-field" htmlFor="login-email">
                  <span>Correo electrónico</span>
                  <div><Mail aria-hidden="true" /><Input id="login-email" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" /></div>
                </label>
                <label className="auth-field" htmlFor="login-password">
                  <span>Contraseña</span>
                  <div><LockKeyhole aria-hidden="true" /><Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Mínimo 6 caracteres" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
                </label>
                <div className="auth-options">
                  <label htmlFor="remember-session"><Checkbox id="remember-session" name="remember" defaultChecked /> <span>Recordarme</span></label>
                  <button type="button" onClick={() => setMessage({ kind: 'info', text: 'La recuperación segura se conectará con la autenticación real.' })}>¿Olvidaste tu contraseña?</button>
                </div>
                {message && <output className={`auth-message ${message.kind}`}>{message.kind === 'info' && <CheckCircle2 />}{message.text}</output>}
                <Button type="submit" className="auth-submit" disabled={loading}>Entrar a Mantis IA <ArrowRight data-icon="inline-end" /></Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="auth-tab-content">
              <form onSubmit={handleRegister} noValidate>
                <label className="auth-field" htmlFor="register-name">
                  <span>Nombre completo</span>
                  <div><UserRound aria-hidden="true" /><Input id="register-name" name="name" autoComplete="name" placeholder="¿Cómo te llamas?" /></div>
                </label>
                <label className="auth-field" htmlFor="register-email">
                  <span>Correo electrónico</span>
                  <div><Mail aria-hidden="true" /><Input id="register-email" name="register-email" type="email" autoComplete="email" placeholder="nombre@correo.com" /></div>
                </label>
                <label className="auth-field" htmlFor="register-password">
                  <span>Crea una contraseña</span>
                  <div><LockKeyhole aria-hidden="true" /><Input id="register-password" name="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mínimo 6 caracteres" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
                </label>
                <label className="auth-terms" htmlFor="demo-terms"><Checkbox id="demo-terms" name="terms" /> <span>Acepto usar esta versión como prototipo de demostración.</span></label>
                {message && <output className={`auth-message ${message.kind}`}>{message.kind === 'info' && <CheckCircle2 />}{message.text}</output>}
                <Button type="submit" className="auth-submit" disabled={loading}>Crear mi espacio <ArrowRight data-icon="inline-end" /></Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="auth-divider"><span>o prueba la experiencia completa</span></div>
          <Button type="button" variant="outline" className="demo-entry" onClick={enterDemo} disabled={loading}><Sparkles data-icon="inline-start" /> Entrar a la demo</Button>
          <p className="auth-disclaimer"><ShieldCheck /> Este acceso guarda una sesión únicamente en tu navegador. La autenticación segura se conectará en la fase de backend.</p>
        </div>

        <p className="auth-footnote">Mantis IA · Prototipo académico de mantenimiento preventivo inteligente</p>
      </section>
    </main>
  );
}

export { SESSION_KEY };
