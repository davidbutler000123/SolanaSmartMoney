'use client';

import Link from 'next/link';
import { Ellipsis, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { getMenuList } from '@/lib/menu-list';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CollapseMenuButton } from '@/components/admin-panel/collapse-menu-button';
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from '@/components/ui/tooltip';
import { useState } from 'react';

interface MenuProps {
	isOpen: boolean | undefined;
}

export function Menu({ isOpen }: MenuProps) {
	const pathname = usePathname();
	const menuList = getMenuList(pathname);
	const [clickedIndex, setClickedIndex] = useState<number>(-1);
	const handleClick = (index: number) => {
		setClickedIndex(index);
	};

	return (
		<ScrollArea className='[&>div>div[style]]:!block'>
			<nav className='mt-8 h-full w-full'>
				<ul className='flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1 px-2'>
					{menuList.map(({ groupLabel, menus }, index) => (
						<li
							key={index}
							className={cn(
								'w-full justify-center items-center',
								groupLabel ? 'pt-5' : ''
							)}>
							{(isOpen && groupLabel) || isOpen === undefined ? (
								<p className='text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate'>
									{groupLabel}
								</p>
							) : !isOpen && isOpen !== undefined && groupLabel ? (
								<div className='w-full flex justify-center items-center'>
									<Ellipsis className='h-5 w-5' />
								</div>
							) : (
								<p className='pb-2'></p>
							)}
							{menus.map(
								({ href, label, icon: Icon, active, submenus }, index) =>
									submenus.length === 0 ? (
										<Link key={index} href={href}>
											<div
												className={`w-full ${
													clickedIndex === index
														? 'text-[#FDD38C] bg-[#322001] border-2 rounded-2xl border-[#FDD38C]'
														: ''
												} px-8 text-sm hover:text-[#FDD38C] py-4 justify-center items-center hover:bg-white dark:hover:bg-[#322001]  hover:border-2 hover:rounded-2xl border-[#000] dark:hover:border-[#FDD38C] mt-4`}
												key={index}
												onClick={() => handleClick(index)}>
												<span
													className={cn(
														isOpen === false
															? ''
															: 'flex flex-col items-center gap-2'
													)}>
													<Icon size={18} />
													<p>{label}</p>
												</span>

												{isOpen === false && <span> {label}</span>}
											</div>
										</Link>
									) : (
										<div className='w-full' key={index}>
											<CollapseMenuButton
												icon={Icon}
												label={label}
												active={active}
												submenus={submenus}
												isOpen={isOpen}
											/>
										</div>
									)
							)}
						</li>
					))}
				</ul>
			</nav>
		</ScrollArea>
	);
}
