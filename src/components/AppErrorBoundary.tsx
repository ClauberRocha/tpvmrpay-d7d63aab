import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
          <div className="w-full max-w-md rounded-2xl border border-destructive/50 bg-destructive/10 p-8 shadow-2xl">
            <div className="mb-4 flex justify-center text-destructive">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Ocorreu um erro inesperado na aplicação. Nosso time já foi notificado.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-32 overflow-auto rounded-lg border border-border bg-muted p-4 text-left font-mono text-xs text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={this.handleReset}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
