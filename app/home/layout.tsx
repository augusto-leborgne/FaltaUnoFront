// Layout específico para /home sin wrappers para debugging
export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
