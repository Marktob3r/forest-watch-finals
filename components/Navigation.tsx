  import { LayoutDashboard, Satellite, FileText, Bell, Trees, GraduationCap, User } from 'lucide-react';
  import Image from 'next/image'
  import { Page } from '../app/page';

  interface NavigationProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
  }

  export function Navigation({ currentPage, onNavigate }: NavigationProps) {
    const navItems = [
      { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'monitor' as Page, label: 'Monitor', icon: Satellite },
      { id: 'report' as Page, label: 'Report', icon: FileText },
      { id: 'reforestation' as Page, label: 'Reforestation', icon: Trees },
      { id: 'learn' as Page, label: 'Learn', icon: GraduationCap },
      { id: 'profile' as Page, label: 'Profile', icon: User },
    ];

    return (
      <>
        <nav className="flex max-[1216px]:hidden items-center justify-between px-8 py-4 bg-card border-b border-border md:fixed md:top-0 md:left-0 md:right-0 md:z-50 md:h-16 md:items-center md:py-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/icons/logo.png"
                width={500}
                height={500}
                alt="Logo"
                draggable={false}
              />
            </div>
            <div>
              <h1 className="text-primary">Forest Watch</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom navigation for widths <= 1216px (icons only) */}
        <nav className="hidden max-[1216px]:block max-[1216px]:fixed max-[1216px]:bottom-0 max-[1216px]:left-0 max-[1216px]:right-0 max-[1216px]:bg-card max-[1216px]:border-t max-[1216px]:border-border max-[1216px]:z-50">
          <div className="grid grid-cols-7 gap-1 px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  }`}
                >
                  <Icon className="w-6 h-6" aria-hidden />
                  <span className="sr-only">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </>
    );
  }
