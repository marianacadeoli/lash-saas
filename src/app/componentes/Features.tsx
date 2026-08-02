'use client'

import './features.css'

const features = [
  {
    icon: '👥',
    title: 'Gestão de Clientes',
    description:
      'Cadastre clientes, organize informações importantes e acompanhe todo o histórico de empréstimos.',
    items: [
      'Cadastro completo',
      'Histórico de operações',
      'Busca rápida',
    ],
  },
  {
    icon: '💰',
    title: 'Gestão de Empréstimos',
    description:
      'Cadastre novos empréstimos, acompanhe juros, parcelas e vencimentos de forma simples.',
    items: [
      'Controle de parcelas',
      'Juros personalizados',
      'Situação em tempo real',
    ],
  },
  {
    icon: '💳',
    title: 'Recebimentos',
    description:
      'Registre pagamentos rapidamente e acompanhe clientes em dia ou com parcelas em atraso.',
    items: [
      'Registro de pagamentos',
      'Controle de inadimplência',
      'Histórico financeiro',
    ],
  },
  {
    icon: '📊',
    title: 'Relatórios Inteligentes',
    description:
      'Visualize indicadores importantes para acompanhar o desempenho da carteira.',
    items: [
      'Total emprestado',
      'Valores recebidos',
      'Lucro da carteira',
    ],
  },
  {
    icon: '☁️',
    title: 'Segurança na Nuvem',
    description:
      'Todos os dados ficam protegidos e disponíveis sempre que você precisar.',
    items: [
      'Backup automático',
      'Acesso de qualquer lugar',
      'Dados protegidos',
    ],
  },
  {
    icon: '🚀',
    title: 'Plataforma em evolução',
    description:
      'Receba melhorias constantes para manter sua operação sempre atualizada.',
    items: [
      'Atualizações frequentes',
      'Novos recursos',
      'Suporte especializado',
    ],
  },
]

export default function Features() {
  return (
   <section className="features" id="recursos">

      <div className="topInfo">

        <div>👥 Gestão de clientes</div>

        <div>💰 Controle financeiro</div>

        <div>📊 Relatórios completos</div>

        <div>☁️ Dados protegidos</div>

      </div>

      <span className="sectionBadge">
        Recursos completos
      </span>

      <h2>
        Tudo o que você precisa para
        <br />
        <span>controlar sua carteira de empréstimos</span>
      </h2>

      <div className="grid">

        {features.map((feature) => (

          <div className="featureCard" key={feature.title}>

            <div className="icon">
              {feature.icon}
            </div>

            <h3>{feature.title}</h3>

            <p>{feature.description}</p>

            <ul>

              {feature.items.map((item) => (

                <li key={item}>
                  ✓ {item}
                </li>

              ))}

            </ul>

          </div>

        ))}

      </div>

    </section>
  )
}