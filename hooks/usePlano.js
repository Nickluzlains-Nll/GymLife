import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { montarPlano } from '../data/Planos';

export default function usePlano() {
    const [perfil, setPerfil] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const uid = auth.currentUser?.uid;

        if (!uid) {
            setCarregando(false);
            return;
        }

        const cancelar = onSnapshot(
            doc(db, 'usuarios', uid),
            (snap) => {
                setPerfil(snap.exists() ? snap.data() : null);
                setCarregando(false);
            },
            (erro) => {
                console.log('Erro ao carregar seu perfil pra o plano:', erro);
                setCarregando(false);
            }
        );

        return cancelar;
    }, []);

    const plano = useMemo(
    () => montarPlano(perfil),
    [
        perfil?.diasTreino,
        perfil?.experiencia,
        perfil?.objetivo,
    ]
    );

    return {plano, treinos: plano.treinos, perfil, carregando};
}