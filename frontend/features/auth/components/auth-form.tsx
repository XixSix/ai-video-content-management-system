"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ApiError } from "@/lib/api/api-error"
import { cn } from "@/lib/utils"
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "../auth.schema"
import { useLogin } from "../hooks/use-login"
import { useRegister } from "../hooks/use-register"
import type { AuthMode } from "../auth.types"
import { getSafeRedirectPath } from "../auth.utils"

type AuthFormInput = LoginInput | RegisterInput

export function AuthForm({
  className,
  mode = "login",
  ...props
}: React.ComponentProps<"div"> & {
  mode?: AuthMode
}) {
  const isSignup = mode === "signup"
  const actionLabel = isSignup ? "Create account" : "Login"
  const providerActionLabel = isSignup ? "Sign up" : "Login"
  const router = useRouter()
  const searchParams = useSearchParams()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const nextPath = getSafeRedirectPath(searchParams.get("next"))
  const authSwitchQuery = `?next=${encodeURIComponent(nextPath)}`
  const {
    register: registerField,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormInput>({
    resolver: zodResolver(isSignup ? registerSchema : loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = handleSubmit(async (credentials) => {
    try {
      if (isSignup) {
        await registerMutation.mutateAsync(credentials)
      } else {
        await loginMutation.mutateAsync(credentials)
      }

      router.replace(nextPath)
    } catch (error) {
      if (error instanceof ApiError) {
        let hasFieldError = false

        const details = Array.isArray(error.details) ? error.details : []

        for (const detail of details) {
          if (detail.path === "email" || detail.path === "password") {
            setError(detail.path, { message: detail.message })
            hasFieldError = true
          }
        }

        if (!hasFieldError) {
          setError("root.server", { message: error.message })
        }
        return
      }

      setError("root.server", {
        message: "Unable to connect to the authentication service",
      })
    }
  })

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-xl">
        <CardHeader className="pt-6 text-center">
          <CardTitle className="text-xl">
            {isSignup ? "Create your account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "Create your workspace account with email and password"
              : "Sign in to continue to your VidPilot workspace"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field data-disabled="true">
                <Button variant="outline" type="button" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  {providerActionLabel} with Apple · Coming soon
                </Button>
                <Button variant="outline" type="button" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  {providerActionLabel} with Google · Coming soon
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or continue with
              </FieldSeparator>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor={`${mode}-email`}>Email</FieldLabel>
                <Input
                  id={`${mode}-email`}
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  disabled={isSubmitting}
                  {...registerField("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <div className="flex items-center">
                  <FieldLabel htmlFor={`${mode}-password`}>Password</FieldLabel>
                  {!isSignup ? (
                    <span className="ml-auto text-sm text-muted-foreground">
                      Forgot your password?
                    </span>
                  ) : null}
                </div>
                <Input
                  id={`${mode}-password`}
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-invalid={Boolean(errors.password)}
                  disabled={isSubmitting}
                  {...registerField("password")}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              {errors.root?.server ? (
                <FieldError>{errors.root.server.message}</FieldError>
              ) : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2Icon className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {actionLabel}
                </Button>
                <FieldDescription className="text-center">
                  {isSignup ? (
                    <>
                      Already have an account?{" "}
                      <Link
                        href={`/login${authSwitchQuery}`}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign in
                      </Link>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <Link
                        href={`/signup${authSwitchQuery}`}
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-5 border-0 bg-transparent px-6 pb-6 pt-0">
          <Separator />
          <FieldDescription className="text-center">
            By clicking continue, you agree to our{" "}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </FieldDescription>
        </CardFooter>
      </Card>
    </div>
  )
}
