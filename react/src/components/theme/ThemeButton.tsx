import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { MoonIcon, SunIcon } from 'lucide-react'

const ThemeButton: React.FC = () => {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      size={'sm'}
      variant={'ghost'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon size={30} /> : <MoonIcon size={30} />}
    </Button>
  )
}

export default ThemeButton
