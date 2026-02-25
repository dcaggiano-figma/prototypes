import React, { useCallback } from 'react';
import { CardPrimitive, IconButton } from '@figma/fpl-components';
import {
  Icon16DesignBrandicon,
  Icon24More,
} from '@figma/fpl-icons';

const CARDS = [
  {
    id: 'design-system',
    title: 'Design System',
    project: 'Resources',
    metadata: 'Modified 1 day ago',
    href: '#',
    thumbnail: './assets/sample.jpg',
    icon: <Icon16DesignBrandicon />,
  },
  {
    id: 'brand-guidelines',
    title: 'Brand Guidelines',
    metadata: 'Modified 1 day ago',
    href: '#',
    thumbnail: './assets/sample.jpg',
    icon: <Icon16DesignBrandicon />,
  },
  {
    id: 'project-alpha',
    title: 'Project Alpha',
    project: 'Resources',
    metadata: 'Modified 1 day ago',
    href: '#',
    thumbnail: './assets/sample.jpg',
    icon: <Icon16DesignBrandicon />,
  },
  {
    id: 'onboarding-flow',
    title: 'Onboarding Flow',
    project: 'Resources',
    metadata: 'Modified 1 day ago',
    href: '#',
    thumbnail: './assets/sample.jpg',
    icon: <Icon16DesignBrandicon />,
  },
];

function HomePage() {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleDoubleClick = useCallback((href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div>
      <h2 className="text-headingLg text-text mb-8px">Home</h2>
      <p className="text-bodyMd text-text-secondary mb-16px">
        Welcome to the app shell. Double-click a card to open the link.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-16px">
        {CARDS.map((card) => (
          <CardPrimitive.Root key={card.id} className="group border border-border rounded-lg focus:outline-1 focus:outline-border-selected focus:outline-offset-1">
            <CardPrimitive.MainLink
              href={card.href}
              onClick={handleClick}
              onDoubleClick={() => handleDoubleClick(card.href)}
              className="focus:outline focus:outline-2 focus:outline-border-selected rounded-lg"
            />
            <div className="border-b border-border bg-bg-secondary overflow-hidden rounded-t-lg">
              <div className="aspect-[3/2]">
                {/* Thumbnail */}
                <img src={card.thumbnail} alt={card.title} className="w-full h-full object-cover" />
              </div>
              {/* Hover actions for the card */}
              <div className="absolute w-full top-0 invisible group-hover:visible flex justify-end p-2">
                <div className="bg-bg rounded-md">
                  <CardPrimitive.Interactive>
                    <IconButton aria-label="More" variant="secondary"><Icon24More /></IconButton>
                  </CardPrimitive.Interactive>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-16px pt-8px pb-16px">
              <div className="flex items-center gap-4px">
                {card.icon}
              </div>
              <div className="overflow-hidden flex flex-col flex-1">
                <CardPrimitive.Title>
                  <h3 className="text-bodyLg text-text">{card.title}</h3>
                </CardPrimitive.Title>
                <p className="truncate text-bodyMd text-text-secondary">
                  {card.project && `${card.project} • `}
                  {card.metadata}
                </p>
              </div>
            </div>
          </CardPrimitive.Root>
        ))}
      </div>
    </div>
  );
}

export default HomePage;
