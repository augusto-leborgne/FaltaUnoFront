import { useState, useEffect } from 'react'
import { PartidoAPI, PartidoDTO, UsuarioMinDTO, InscripcionAPI } from './api'
import { useToast } from '@/hooks/use-toast'

export function usePartido(id: string) {
  const [partido, setPartido] = useState<PartidoDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!id) return
    
    const loadPartido = async () => {
      try {
        setLoading(true)
        const response = await PartidoAPI.get(id)
        if (response.success && response.data) {
          setPartido(response.data)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error cargando partido')
        setError(error)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadPartido()
  }, [id])

  return { partido, loading, error, refresh: () => setPartido(null) }
}

export function useJugadores(partidoId: string) {
  const [jugadores, setJugadores] = useState<UsuarioMinDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!partidoId) return
    
    const loadJugadores = async () => {
      try {
        setLoading(true)
        const response = await PartidoAPI.getJugadores(partidoId)
        if (response.success && response.data) {
          setJugadores(response.data)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error cargando jugadores')
        setError(error)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadJugadores()
  }, [partidoId])

  return { jugadores, loading, error }
}

export function useInscripcionEstado(partidoId: string, usuarioId: string) {
  const [estado, setEstado] = useState<{
    inscrito: boolean;
    estado: string | null;
    inscripcionId?: string;
  }>({ inscrito: false, estado: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!partidoId || !usuarioId) return
    
    const loadEstado = async () => {
      try {
        setLoading(true)
        const response = await InscripcionAPI.getEstado(partidoId, usuarioId)
        if (response.success && response.data) {
          setEstado(response.data)
        }
      } catch (err) {
        console.error('Error cargando estado inscripción:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEstado()
  }, [partidoId, usuarioId])

  return { estado, loading, refresh: () => setEstado({ inscrito: false, estado: null }) }
}