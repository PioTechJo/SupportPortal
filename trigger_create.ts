import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;
(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

async function run() {
  try {
    const { api } = await import('./src/lib/api');
    const { supabase } = await import('./src/lib/supabase');
    await supabase.auth.signInWithPassword({ email: 'admin@pio-tech.com', password: 'password' });

    const ticket = await api.createTicket({
      title: 'Debug Ticket',
      description: 'Testing the insert payload',
      status: 'open',
      priority: 'medium',
      category: 'software',
      tenant_id: '4d920ae1-388f-4765-8033-cb86ff63ebe4',
      product_id: '2cd018ef-353a-4c8c-9169-fc47b3f52d6d'
    });
    console.log("Success:", ticket.id);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
run();
