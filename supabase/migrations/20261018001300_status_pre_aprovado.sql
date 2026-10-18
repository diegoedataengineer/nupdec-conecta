-- Nupdec Conecta — aprovação em duas etapas (1/2): novo status do membro
-- pendente → pre_aprovado (líder do núcleo) → aprovado (coordenador da Compdec)
alter type public.status_membro add value if not exists 'pre_aprovado' after 'pendente';
