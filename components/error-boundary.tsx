"use client"

import { Component, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.href = '/home'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
          <div className="max-w-md w-full text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Algo salió mal!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Lo sentimos, ocurrió un error inesperado. Por favor, intenta recargar la página.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-left">
                <p className="text-xs text-gray-500 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Recargar página
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                Ir al inicio
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
