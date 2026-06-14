'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  style?: 'primary' | 'dim' | 'blue' | 'amber';
}

interface LcarsHeaderProps {
  title: string;
  nav: NavItem[];
  stardate?: string;
}

export default function LcarsHeader({ title, nav }: LcarsHeaderProps) {
  const pathname = usePathname();
  const navWithActive = nav.map((item) => ({
    ...item,
    active: item.href === pathname || pathname.startsWith(item.href + '/'),
  }));

  



  return (
    <header
      style={{ height: 'var(--lcars-header-h)' }}
      className="flex items-stretch w-full"
    >
      {/* Sidebar */}
      <div className="flex w-[var(--lcars-bar-width)]">
        <div className="flex flex-col items-center justify-content">
          <div style={{
            width: 'var(--lcars-bar-width)',
            height: 'calc(var(--lcars-header-h) - calc(32px + var(--lcars-bar-width)))',
            background: 'var(--lcars-rose-light)',
            marginBottom: '4px',
          }}/>
          <div className="flex flex-col justify-end h-[100px] w-full">
            <div className="h-[64px] w-full" style={{ background: 'var(--lcars-purple'}}/>
            <div className="lcars-elbow-bl" style={{
              width: 'var(--lcars-bar-width)',
              height: 'calc(var(--lcars-bar-width)/4)',
              background: 'var(--lcars-purple)',
              marginBottom: '4px',
              borderRadius:'0% 0% 0% 60%',
            }}/>
            <div className="lcars-elbow-tl" style={{
              width: 'var(--lcars-bar-width)',
              height: 'calc(var(--lcars-bar-width)/4)',
              background: 'var(--lcars-red)',
              borderRadius:'60% 0% 0% 0%',
            }}/>
          </div>

        </div>
      </div>

      {/* Main Content */}

      <div className="flex flex-col h-full w-full">
        {/* Info-Box & Menu */}
        <div className="flex-grow w-full"></div>

        {/* Footer Bar */}
        <div className="flex h-[36px] gap-1 justify-start">
          {/* Fortsetzung der Elbows */}
          <div className="flex flex-col justify-content h-full w-[40%]">
            <div className='lcars-elbow-top w-full'
              style={{
                background: 'var(--lcars-purple)',
                height: '16px',
                marginBottom: '4px',
            }}/>
            <div className='lcars-elbow-bottom w-full'
              style={{
                background: 'var(--lcars-red)',
                height: '16px ',
            }}/>
          </div>

          {/* Mittelstücke */}
          <div className="flex flex-col justify-content h-full w-[5%]" style={{marginLeft: '4px'}}>
            <div className='w-full'
              style={{
                height: '16px',
                marginBottom: '4px',
                background: 'var(--lcars-amber)'
            }}/>
            <div className='w-full'
              style={{
                height: '16px',
                background: 'var(--lcars-amber-dim)'
            }}/>
          </div>

          <div className="flex flex-col justify-content h-full w-[10%]" style={{marginLeft: '4px'}}>
            <div className='w-full'
              style={{
                height: '16px',
                marginBottom: '4px',
                background: 'var(--lcars-rose-light)'
            }}/>
            <div className='w-full'
              style={{
                height: '8px',
                background: 'var(--lcars-amber-dim)'
            }}/>
          </div>

          <div className="flex flex-col justify-content h-full w-[40%]" style={{marginLeft: '4px'}}>
            <div className='w-full'
              style={{
                height: '16px',
                marginBottom: '4px',
                background: 'var(--lcars-rose-light)'
            }}/>
            <div className='w-full'
              style={{
                height: '16px',
                background: 'var(--lcars-rose-light)'
            }}/>
          </div>

          <div className="flex flex-col justify-content h-full w-[5%]" style={{marginLeft: '4px'}}>
            <div className='w-full'
              style={{
                height: '16px',
                marginBottom: '4px',
                background: 'var(--lcars-red)'
            }}/>
            <div className='w-full'
              style={{
                height: '16px',
                background: 'var(--lcars-amber-dim)'
            }}/>
          </div>
        </div>

      </div>
    


    </header>
  );
}