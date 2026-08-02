'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import './register.css'

export default function RegisterPage() {

    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState(1)

    // Etapa 1
    const [email, setEmail] = useState('')
    const [confirmarEmail, setConfirmarEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')

    // Etapa 2
    const [tipoCadastro, setTipoCadastro] = useState('pf')
    const [nome, setNome] = useState('')
    const [cpf, setCpf] = useState('')
    const [telefone, setTelefone] = useState('')

    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState('')
    const [carregando, setCarregando] = useState(false)

    const [aceitouLgpd, setAceitouLgpd] = useState(false)
    const [aceitouTermos, setAceitouTermos] = useState(false)

    async function handleRegister(e: FormEvent) {

        e.preventDefault()

        setErro('')
        setSucesso('')

        if (email !== confirmarEmail) {
            setErro('Os e-mails não coincidem.')
            return
        }

        if (senha !== confirmarSenha) {
            setErro('As senhas não coincidem.')
            return
        }

        if (!aceitouLgpd || !aceitouTermos) {
            setErro('Você precisa aceitar os termos.')
            return
        }

        try {

            setCarregando(true)

            const { error } = await supabase.auth.signUp({

                email,
                password: senha,

                options: {

                    data: {

                        nome,
                        telefone,
                        cpf,
                        tipoCadastro

                    }

                }

            })

            if (error) {

                setErro(error.message)
                return

            }

            setSucesso('Conta criada com sucesso!')

            setTimeout(() => {

                router.push('/login')

            }, 2000)

        } finally {

            setCarregando(false)

        }

    }

    return (

        <main className="registerPage">

            <div className="registerCard">

                <Image
                    src="/logo.png"
                    alt="PainelEmprest"
                    width={200}
                    height={60}
                    className="registerLogo"
                />

                <h1>Criar Conta</h1>

                <span className="registerBadge">

                    Teste grátis por 7 dias — sem cobrança agora

                </span>

<form className="registerForm" onSubmit={handleRegister}>

    <div className="inputGroup">
        <label>Nome Completo *</label>

        <input
            type="text"
            placeholder="Ex: João da Silva"
            value={nome}
            onChange={(e)=>setNome(e.target.value)}
        />
    </div>

    <div className="inputGroup">
        <label>E-mail *</label>

        <input
            type="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
        />
    </div>

    <div className="inputGroup">
        <label>Confirmar E-mail *</label>

        <input
            type="email"
            placeholder="Repita seu e-mail"
            value={confirmarEmail}
            onChange={(e)=>setConfirmarEmail(e.target.value)}
        />
    </div>

    <div className="inputGroup">
        <label>CPF *</label>

        <input
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e)=>setCpf(e.target.value)}
        />
    </div>

    <div className="inputGroup">
        <label>Senha *</label>

        <input
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e)=>setSenha(e.target.value)}
        />
    </div>

    <div className="inputGroup">
        <label>Confirmar Senha *</label>

        <input
            type="password"
            placeholder="Repita a senha"
            value={confirmarSenha}
            onChange={(e)=>setConfirmarSenha(e.target.value)}
        />
    </div>

    <label className="checkbox">

        <input
            type="checkbox"
            checked={aceitouLgpd}
            onChange={(e)=>setAceitouLgpd(e.target.checked)}
        />

        Li e aceito a Política de Privacidade (LGPD)

    </label>

    <label className="checkbox">

        <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(e)=>setAceitouTermos(e.target.checked)}
        />

        Li e aceito os Termos de Uso

    </label>

    {erro && (
        <div className="errorBox">
            {erro}
        </div>
    )}

    {sucesso && (
        <div className="successBox">
            {sucesso}
        </div>
    )}

    <button
        type="submit"
        className="registerButton"
        disabled={carregando}
    >
        {carregando
            ? 'Criando conta...'
            : 'Criar conta gratuitamente'}
    </button>

</form>

<div className="registerFooter">

    <span>
        Já possui uma conta?
    </span>

    <Link href="/login">
        Entrar
    </Link>

</div>

</div>

</main>

)

}