import { supabase } from '@/lib/supabase/client';

export default async function TesteSupabase() {
  const { data, error } = await supabase.from('questions').select('*');

  if (error) {
    return <div>Erro ao buscar dados: {error.message}</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Teste de conexão com Supabase</h1>
      {data?.map((item) => (
        <div key={item.id} style={{ marginBottom: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
          <p><strong>Tópico:</strong> {item.topic}</p>
          <p><strong>Pergunta:</strong> {item.question}</p>
          <p><strong>Resposta:</strong> {item.answer}</p>
        </div>
      ))}
    </div>
  );
}