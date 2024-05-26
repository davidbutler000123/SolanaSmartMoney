import React, { useEffect, useRef, useState } from 'react';
import Pagination from './pagination';
import Vectorearth from '@/assets/Vectorearth.svg';
import Vectortelegram from '@/assets/Vectortelegram.svg';
import Vectortwitter from '@/assets/Vectortwitter.svg';
import Vectorsol from '@/assets/Vectorsol.svg';
import Vectorclock from '@/assets/Vectorclock.svg';
import Vectordex from '@/assets/Vectordex.svg';
import Vectorcheck from '@/assets/Vectorcheck.svg';
import VectorUncheck from '@/assets/VectorUncheck.svg';
import CopyToClipboard from '@/components/ui/snippet';
import { Button } from '@/components/ui/button';
import {
	convertTime,
	divideAndRound,
	getTimeFormat,
	roundToFourDecimals,
	SmartItem,
	TableProps,
} from '../utils';
import axios from 'axios';
import PaginationCustom from './paginationCustom';

const ITEMS_PER_PAGE = 10;

const serverUrl = 'http://95.217.146.177:5000';
// const serverUrl = 'https://95.217.146.177:5000';
const TableComponentSmart: React.FC<TableProps> = ({ updateType }) => {
	const [currentPage, setCurrentPage] = useState<number>(1);
	const totalPageRef = useRef(0);
	const currentPageref = useRef(1);
	const currentTyperef = useRef('0');
	const [currentItems, setCurrentItems] = useState<SmartItem[]>([]);

	useEffect(() => {
		// const intervalId = setInterval(getServerData, 1000);
		// const intervalId = setInterval(getServerData, 1000);
		// getServerData();
		const intervalSmartId = setInterval(getServerData, 1000);

		// Clear the interval when the component unmounts
		return () => clearInterval(intervalSmartId);
	}, []);

	useEffect(() => {
		console.log('update', '11');
		let curType = 's0';
		if (updateType === 'Individual') curType = 's0';
		else curType = 's1';
		currentTyperef.current = curType;
		totalPageRef.current = 0;
		let curPage = 1;
		let curTypeItem = localStorage.getItem(curType);
		if (curTypeItem !== null) {
			curPage = parseInt(curTypeItem);
		}
		console.log('curPage--', curPage);
		currentPageref.current = curPage;

		getServerData();
		setCurrentPage(curPage);
	}, [updateType]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		localStorage.setItem(currentTyperef.current, page.toString());
		currentPageref.current = page;
		getServerData();
	};

	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

	const getServerData = () => {
		let type = '0';
		if (currentTyperef.current === 's1') type = '1';
		const params = {
			offset: currentPageref.current - 1,
			limit: ITEMS_PER_PAGE,
			type: type,
		};
		console.log('params----------------', params);

		axios
			.get(`${serverUrl}/api/walletAlerts`, { params })
			.then((response) => {
				console.log('getServerData-', response);
				totalPageRef.current = response.data.total;
				console.log('smart--1111');
				const alerts = response.data.alerts.map((item: any) => {
					return {
						logoUrl: item.pool.logoURI,
						pairInfo: [item.pool.tokenSymbol, item.pool.tokenName],
						pairs: item.pool.pairAddress,
						wallet: { type: true, value: item.owner },
						signal: [convertTime(item.createdAt), item.pool.pairAgeLabel],
						audit: [
							item.pool.mintDisabled,
							item.pool.lpBurned,
							item.pool.top10,
						],
						initialLP: [
							roundToFourDecimals(item.pool.initLiquiditySol),
							divideAndRound(item.pool.initLiquidityUsd),
						],
						fdvSignal: [
							roundToFourDecimals(item.pool.fdvSol),
							divideAndRound(item.pool.fdvUsd),
						],
						fdvAth: [
							roundToFourDecimals(item.pool.fdvAthSol),
							divideAndRound(item.pool.fdvAthUsd),
						],
						fdvNow: [
							roundToFourDecimals(item.pool.fdvNowSol),
							divideAndRound(item.pool.fdvNowUsd),
						],
						roiAth: item.pool.roiAth,
						roiNow: item.pool.roiNow,
						social: [
							item.pool.webSiteUrl,
							item.pool.telegramUrl,
							item.pool.twitterUrl,
							item.pool.dexUrl,
						],
					};
				});
				console.log('smart--', alerts, totalPageRef.current);
				setCurrentItems(alerts);
			})
			.catch((error) => {
				console.log('getServerData-', error);
			});
	};

	return (
		<div className='w-full bg-white dark:bg-black '>
			<div className='overflow-x-auto'>
				<table className='min-w-full divide-y divide-[#4C4C4C] whitespace-nowrap'>
					<thead className='bg-white bg-opacity-10'>
						<tr className='text-xs font-medium'>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								PAIR INFO
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								PAIRS
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								WALLET
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								SIGNAL/AFTER OPEN
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								AUDIT
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								INITAL LP
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV (SIGNAL)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV(ATH)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV(NOW)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								ROI(ATH)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								ROI (NOW)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								SOCIAL
							</th>
						</tr>
					</thead>
					<tbody className='bg-white dark:bg-black divide-y text-white divide-[#4C4C4C]'>
						{currentItems.map((item, index) => (
							<tr key={index} className='text-black dark:text-white'>
								<td className='pl-4 pr-12 py-4 '>
									<div className='flex flex-row gap-2'>
										<img
											src={item.logoUrl}
											width={40}
											height={40}
											alt='Token Avatar'
										/>
										<div className='flex flex-col gap-1'>
											<span className='text-[13px] leading-4 font-bold'>
												{item.pairInfo[0]}
											</span>
											<span className='text-[10px] text-black dark:text-white opacity-80 leading-3 whitespace-nowrap'>
												{item.pairInfo[1]}
											</span>
										</div>
									</div>
								</td>
								<td className='px-2 py-4 '>
									<div className='flex justify-center items-center text-black dark:text-white opacity-80'>
										<CopyToClipboard snippetText={item.pairs} />
									</div>
								</td>
								<td className='px-2 py-4 '>
									<div className={`flex justify-center items-center`}>
										{item.wallet.type === true ? (
											<CopyToClipboard snippetText={item.wallet.value} />
										) : (
											<span className='font-medium  text-[13px] leading-[18.85px] text-[#FDD38C]'>
												{item.wallet.value}
											</span>
										)}
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row font-medium text-[12px] leading-4 items-center gap-2 whitespace-nowrap'>
										<Vectorclock fill='white' width={11} height={11} />
										<div>
											<span className=' text-black dark:text-white opacity-80'>
												{item.signal[0] + '/'}
											</span>
											<span className='text-[14px]'>{item.signal[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row text-xs gap-3 text-black dark:text-white opacity-80'>
										<div className='flex flex-col items-center  gap-2'>
											{item.audit[0] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<Vectorcheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap  text-center'>
												Mint Disabled
											</span>
										</div>
										<div className='flex flex-col items-center  gap-2'>
											{item.audit[1] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<Vectorcheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap text-center'>
												LP Burned
											</span>
										</div>
										<div className='flex flex-col items-center gap-2'>
											{item.audit[2] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<Vectorcheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap text-center'>
												Top 10-20%
											</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.initialLP[0]}</span>
											<span className='opacity-80'>{item.initialLP[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvSignal[0]}</span>
											<span className='opacity-80'>{item.fdvSignal[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvAth[0]}</span>
											<span className='opacity-80'>{item.fdvAth[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvNow[0]}</span>
											<span className='opacity-80'>{item.fdvNow[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 text-[#27AD75] font-bold text-[13px] leading-[18.85px]'>
									{item.roiAth}x{' '}
								</td>
								<td className='px-6 py-4 text-[#27AD75] font-bold text-[13px] leading-[18.85px]'>
									{item.roiNow}x{' '}
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-3'>
										{item.social[0] !== '' ? (
											<a href={item.social[3]}>
												<Vectorearth
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
										{item.social[1] !== '' ? (
											<a href={item.social[3]}>
												<Vectortelegram
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
										{item.social[2] !== '' ? (
											<a href={item.social[3]}>
												<Vectortwitter
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
										{item.social[3] !== '' ? (
											<a href={item.social[3]}>
												<Vectordex
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<PaginationCustom
				currentPage={currentPage}
				totalPages={totalPageRef.current}
				onPageChange={handlePageChange}
			/>
		</div>
	);
};

export default TableComponentSmart;
1;
