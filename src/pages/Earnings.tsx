import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { app } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface IncentiveBreakdown {
  visitType: string;
  totalCount: number;
  verifiedCount: number;
  flaggedCount: number;
  rate: number;
  grossAmount: number;
  deduction: number;
  netAmount: number;
}

interface IncentiveResult {
  workerId: string;
  workerName: string;
  period: string;
  breakdown: IncentiveBreakdown[];
  totalGross: number;
  totalDeductions: number;
  netDisbursement: number;
  totalVisits: number;
  verifiedVisits: number;
  flaggedVisits: number;
  ghostReportingRisk: string;
  recommendation: string;
  anomalyPatterns: string[];
}

const Earnings = () => {
  const { currentUser } = useAuth();
  const [incentiveData, setIncentiveData] = useState<IncentiveResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.photoURL) return;
    
    const fetchIncentives = async () => {
      try {
        const functions = getFunctions(app, 'asia-south1');
        const calculateIncentive = httpsCallable<{ workerId: string }, IncentiveResult>(functions, 'calculateIncentive');
        
        const response = await calculateIncentive({ workerId: currentUser.photoURL! });
        setIncentiveData(response.data);
      } catch (err: unknown) {
        console.error('Failed to fetch incentives', err);
        setError('Failed to fetch incentive data from server.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIncentives();
  }, [currentUser]);

  return (
    <div className="flex flex-col h-full w-full">
            <main className="flex-1 h-full overflow-y-auto bg-surface-container-lowest">
        {/* Header */}
        <header className="flex justify-between items-center px-6 md:px-10 py-6 border-b border-border-default bg-surface sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Link to="/app/field" className="text-on-surface-variant hover:text-on-surface transition-colors p-2 -ml-2 rounded-full hover:bg-surface-container-low">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-title-xl text-on-surface font-bold text-[22px]">Earnings</h1>
              <p className="font-label-md text-on-surface-variant text-[13px]">Task-Based Incentive (TBI) Breakdown</p>
            </div>
          </div>
        </header>

        <div className="px-6 md:px-10 py-6">
          {/* Total Earnings Hero Card */}
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <p className="font-label-md text-[13px] text-white/80 uppercase tracking-wider mb-2">Total Estimated Earnings</p>
              <p className="font-display-hero text-[48px] font-bold leading-none mb-4">
                ₹{incentiveData?.netDisbursement?.toLocaleString('en-IN') || 0}
              </p>
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{incentiveData?.verifiedVisits || 0}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Verified Visits</p>
                </div>
                <div className="w-px bg-white/30"></div>
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{incentiveData?.flaggedVisits || 0}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Flagged / Pending</p>
                </div>
                <div className="w-px bg-white/30"></div>
                <div>
                  <p className="font-headline-kpi text-[22px] font-bold">{incentiveData?.totalVisits || 0}</p>
                  <p className="font-label-sm text-[11px] text-white/70 uppercase">Total Visits</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Risk Assessment */}
          {incentiveData && incentiveData.flaggedVisits > 0 && (
            <div className="mb-8 bg-surface border border-error/20 rounded-xl overflow-hidden">
              <div className="bg-error/10 p-4 border-b border-error/20 flex gap-3 items-center">
                <span className="material-symbols-outlined text-error">warning</span>
                <h3 className="font-title-sm text-error font-bold">Payouts Withheld for Review</h3>
              </div>
              <div className="p-4">
                <p className="font-body-base text-on-surface-variant mb-2">
                  ₹{incentiveData.totalDeductions.toLocaleString('en-IN')} has been temporarily withheld pending supervisor review.
                </p>
                <div className="bg-surface-container-low p-3 rounded text-sm text-on-surface-variant font-data-mono">
                  <strong>AI Analysis:</strong> {incentiveData.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* Earnings Breakdown Table */}
          <div className="bg-surface rounded-xl border border-border-default overflow-hidden">
            <div className="p-5 border-b border-border-default">
              <h2 className="font-title-md text-[18px] text-on-surface font-semibold">TBI Breakdown</h2>
              <p className="font-label-sm text-[12px] text-secondary mt-1">Rates as per National Health Mission (NHM) guidelines</p>
            </div>
            {loading ? (
              <div className="p-12 text-center text-secondary animate-pulse">Calculating earnings...</div>
            ) : error ? (
              <div className="p-12 text-center text-error">{error}</div>
            ) : !incentiveData || incentiveData.breakdown.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant block mb-3">payments</span>
                <p className="text-secondary font-title-md text-[16px]">No earnings yet this month.</p>
                <p className="font-body-base text-secondary mt-2">Log visits to start earning incentives.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-border-default">
                  <tr>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider">Service Type</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-center">Verified</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-center">Flagged</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-right">Rate</th>
                    <th className="p-4 font-label-sm text-[11px] text-secondary uppercase tracking-wider text-right">Net Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {incentiveData.breakdown.map(line => (
                    <tr key={line.visitType} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="p-4">
                        <span className="font-title-sm text-[14px] text-on-surface">{line.visitType}</span>
                      </td>
                      <td className="p-4 font-data-mono text-[14px] text-center text-on-surface">{line.verifiedCount}</td>
                      <td className="p-4 font-data-mono text-[14px] text-center text-error">{line.flaggedCount > 0 ? line.flaggedCount : '-'}</td>
                      <td className="p-4 font-data-mono text-[14px] text-right text-secondary">₹{line.rate}</td>
                      <td className="p-4 font-data-mono text-[14px] text-right text-on-surface font-bold">₹{line.netAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-container-low border-t-2 border-primary/30">
                  <tr>
                    <td className="p-4 font-title-sm text-[14px] text-on-surface font-bold" colSpan={4}>Total Net Disbursement</td>
                    <td className="p-4 font-headline-kpi text-[18px] text-primary font-bold text-right">₹{incentiveData.netDisbursement.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-surface-container-low rounded-lg border border-border-default">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">info</span>
              <p className="font-label-sm text-[12px] text-secondary leading-relaxed">
                <strong>Note:</strong> Earnings are estimated based on NHM TBI guidelines and verified visit logs. 
                Final disbursement amounts may vary based on state-specific policies and PHC verification.
                Payments are processed through Direct Benefit Transfer (DBT) to your linked bank account.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Earnings;
