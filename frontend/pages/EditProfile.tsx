
import React, { useState, useContext, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';

/* ──────────────────────────────────────────────────────────
   API helpers
────────────────────────────────────────────────────────── */
const CN_BASE = 'https://countriesnow.space/api/v0.1';

const fetchStates = async (country: string): Promise<string[]> => {
  const r = await fetch(`${CN_BASE}/countries/states`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country }),
  });
  const d = await r.json();
  return (d.data?.states || []).map((s: any) => s.name).sort();
};

const fetchCitiesByState = async (country: string, state: string): Promise<string[]> => {
  const r = await fetch(`${CN_BASE}/countries/state/cities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, state }),
  });
  const d = await r.json();
  return (d.data || []).sort();
};

/* ──────────────────────────────────────────────────────────
   Auto-generate Staff ID (unique, no duplicates)
────────────────────────────────────────────────────────── */
const generateStaffId = async (): Promise<string> => {
  try {
    const allUsers = await ApiService.getUsers();
    const used = new Set<string>(
      allUsers
        .filter((u: any) => typeof u.staffId === 'string' && u.staffId.startsWith('BITS-STF-'))
        .map((u: any) => u.staffId as string)
    );
    let counter = 1;
    let id = '';
    do {
      id = `BITS-STF-${String(counter).padStart(3, '0')}`;
      counter++;
    } while (used.has(id));
    return id;
  } catch {
    return `BITS-STF-${Date.now().toString(36).toUpperCase()}`;
  }
};

/* ══════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════ */
const EditProfile: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  /* location cascade */
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);   // = cities of a state (district placeholders)
  const [locationStep, setLocationStep] = useState<'idle' | 'states' | 'districts'>('idle');

  /* ── INIT formData from user profile ── */
  useEffect(() => {
    if (!user) return;
    const full = user.name || '';
    const spaceIdx = full.indexOf(' ');
    const firstName = spaceIdx > -1 ? full.slice(0, spaceIdx) : full;
    const lastName = spaceIdx > -1 ? full.slice(spaceIdx + 1) : '';
    setFormData({
      firstName: (user as any).firstName || firstName,
      lastName: (user as any).lastName || lastName,
      email: user.email || '',
      phone: (user as any).phone || '',
      department: user.department || '',
      staffId: user.staffId || '',
      regNo: user.regNo || '',
      designation: user.designation || '',
      experience: user.experience || '',
      country: (user as any).country || '',
      state: (user as any).state || '',
      district: (user as any).district || '',
      city: (user as any).city || '',
    });
  }, [user]);

  /* ── Load all countries ── */
  useEffect(() => {
    fetch(`${CN_BASE}/countries/positions`)
      .then(r => r.json())
      .then(d => {
        if (d.data) setCountries(d.data.map((c: any) => c.name).sort());
      })
      .catch(() => setCountries(['India', 'United States', 'United Kingdom', 'Canada', 'Australia']));
  }, []);

  /* ── Pre-load existing saved state/district lists ── */
  useEffect(() => {
    const country = (user as any)?.country;
    const state = (user as any)?.state;
    if (!country) return;

    setLocationStep('states');
    fetchStates(country)
      .then(list => {
        setStates(list);
        setLocationStep('idle');
        if (state) {
          setLocationStep('districts');
          return fetchCitiesByState(country, state);
        }
      })
      .then(cities => {
        if (cities) setDistricts(cities);
        setLocationStep('idle');
      })
      .catch(() => setLocationStep('idle'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ── Load departments ── */
  useEffect(() => {
    ApiService.getUsers().then((users: any[]) => {
      const unique = Array.from(
        new Set<string>(
          users.map((u: any) => u.department).filter((d: any) => d && d.trim() !== '' && d !== 'General')
        )
      ).sort();
      setAvailableDepartments(
        unique.length > 0
          ? unique
          : [
            'Artificial Intelligence and Data Science',
            'Computer Science and Engineering',
            'Information Technology',
            'Electronics and Communication Engineering',
            'Electrical and Electronics Engineering',
            'Mechanical Engineering',
            'Civil Engineering',
            'Computer Communication Engineering',
            'Aeronautical Engineering',
            'Bio-Technology',
          ]
      );
    });
  }, []);

  /* ══════════════════════════════════════════════════════
     CASCADE HANDLERS
  ══════════════════════════════════════════════════════ */

  const handleCountryChange = async (country: string) => {
    setStates([]);
    setDistricts([]);
    setFormData((p: any) => ({ ...p, country, state: '', district: '', city: '' }));
    if (!country) return;
    setLocationStep('states');
    try {
      const list = await fetchStates(country);
      setStates(list);
    } catch { /* silent */ }
    setLocationStep('idle');
  };

  const handleStateChange = async (state: string, country: string) => {
    setDistricts([]);
    setFormData((p: any) => ({ ...p, state, district: '', city: '' }));
    if (!state || !country) return;
    setLocationStep('districts');
    try {
      const list = await fetchCitiesByState(country, state);
      setDistricts(list);
    } catch { /* silent */ }
    setLocationStep('idle');
  };

  const handleDistrictChange = (district: string) => {
    setFormData((p: any) => ({ ...p, district, city: '' }));
  };

  /* ── Auto-generate Staff ID ── */
  const handleGenerateStaffId = async () => {
    setIsGeneratingId(true);
    const id = await generateStaffId();
    setFormData((p: any) => ({ ...p, staffId: id }));
    setIsGeneratingId(false);
  };

  /* ══════════════════════════════════════════════════════
     SAVE
  ══════════════════════════════════════════════════════ */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const fullName = `${(formData.firstName || '').trim()} ${(formData.lastName || '').trim()}`.trim().toUpperCase();
      const payload = { ...formData, name: fullName };
      await ApiService.updateUser(user.id, payload);
      setUser({ ...user, ...payload });
      alert('Profile Updated Successfully');
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     STYLE HELPERS
  ══════════════════════════════════════════════════════ */
  const input =
    'w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all';
  const select =
    'w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  const lbl = 'text-[10px] font-black text-text-muted uppercase tracking-widest px-1';

  const Section = ({ title }: { title: string }) => (
    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-5">{title}</p>
  );

  const loading = locationStep !== 'idle';

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <DashboardLayout title="Edit Profile">
      <div className="max-w-4xl mx-auto py-10">
        <div className="bg-surface-elevated rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="p-12 bg-primary/5 border-b border-border-subtle flex items-center gap-8">
            <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-primary/30">
              {user?.name?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-3xl font-black text-text-primary uppercase tracking-tight">{user?.name}</h2>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.4em] mt-2">
                Institutional Identity Management
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-12 space-y-10">

            {/* ── Personal Information ── */}
            <div>
              <Section title="Personal Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className={lbl}>First Name <span className="text-red-400">*</span></label>
                  <input
                    type="text" required placeholder="e.g. JOHN"
                    value={formData.firstName || ''}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className={input}
                  />
                </div>
                <div className="space-y-3">
                  <label className={lbl}>Last Name</label>
                  <input
                    type="text" placeholder="e.g. DOE"
                    value={formData.lastName || ''}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className={input}
                  />
                </div>
                <div className="space-y-3">
                  <label className={lbl}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`${input} font-mono`}
                  />
                </div>
                <div className="space-y-3">
                  <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
                  <input
                    type="tel" required placeholder="+91 9876543210"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={`${input} font-mono`}
                  />
                </div>
              </div>
            </div>

            {/* ── Academic Details ── */}
            <div>
              <Section title="Academic Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Department */}
                <div className="space-y-3">
                  <label className={lbl}>Department</label>
                  <input
                    type="text" list="dept-list" placeholder="Type or select..."
                    value={formData.department || ''}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className={`${input} font-bold`}
                  />
                  <datalist id="dept-list">
                    {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                  </datalist>
                </div>

                {/* Reg No (student) / Staff ID with auto-generate (staff) */}
                {user?.role === 'STUDENT' ? (
                  <div className="space-y-3">
                    <label className={lbl}>Registration Number</label>
                    <input
                      type="text"
                      value={formData.regNo || ''}
                      onChange={e => setFormData({ ...formData, regNo: e.target.value })}
                      className={`${input} font-mono`}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className={lbl}>
                      Staff ID
                      <span className="ml-2 text-text-muted font-normal normal-case">
                        (auto-generated if empty)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BITS-STF-001"
                        value={formData.staffId || ''}
                        onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                        className={`${input} font-mono flex-1`}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateStaffId}
                        disabled={isGeneratingId}
                        title="Auto-generate unique Staff ID"
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      >
                        {isGeneratingId ? '...' : 'Auto ✦'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Designation + Experience (non-student) */}
                {user?.role !== 'STUDENT' && (
                  <>
                    <div className="space-y-3">
                      <label className={lbl}>Designation</label>
                      <input
                        type="text"
                        value={formData.designation || ''}
                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                        className={input}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className={lbl}>Experience (Years)</label>
                      <input
                        type="number" min="0" max="60"
                        value={formData.experience || ''}
                        onChange={e => setFormData({ ...formData, experience: e.target.value })}
                        className={input}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Location ── */}
            <div>
              <div className="mb-5 flex items-center gap-3">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Location</p>
                {loading && (
                  <span className="text-[10px] text-primary animate-pulse font-bold">
                    {locationStep === 'states' ? 'Loading states...' : 'Loading districts...'}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-text-muted uppercase tracking-widest -mt-4 mb-5">
                Select in order: Country → State → District → City
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Country */}
                <div className="space-y-3">
                  <label className={lbl}>Country <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={formData.country || ''}
                    onChange={e => handleCountryChange(e.target.value)}
                    className={select}
                  >
                    <option value="" disabled>Select Country</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* State */}
                <div className="space-y-3">
                  <label className={lbl}>State <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={formData.state || ''}
                    onChange={e => handleStateChange(e.target.value, formData.country || '')}
                    disabled={!formData.country || (locationStep === 'states')}
                    className={select}
                  >
                    <option value="" disabled>
                      {locationStep === 'states' ? 'Loading...' : 'Select State'}
                    </option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* District (uses city list from countriesnow as district-level entries) */}
                <div className="space-y-3">
                  <label className={lbl}>District <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={formData.district || ''}
                    onChange={e => handleDistrictChange(e.target.value)}
                    disabled={!formData.state || (locationStep === 'districts')}
                    className={select}
                  >
                    <option value="" disabled>
                      {locationStep === 'districts' ? 'Loading...' : 'Select District'}
                    </option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* City — free-text input (no free API provides city-within-district) */}
                <div className="space-y-3">
                  <label className={lbl}>City <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    required
                    list="city-suggestions"
                    placeholder={formData.district ? 'Enter your city' : 'Select a district first'}
                    value={formData.city || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, city: e.target.value }))}
                    disabled={!formData.district}
                    className={`${input} disabled:opacity-40`}
                  />
                  {/* Suggest cities from the district list as hints */}
                  <datalist id="city-suggestions">
                    {districts
                      .filter(d =>
                        formData.district &&
                        d.toLowerCase().includes(formData.district.toLowerCase().slice(0, 4))
                      )
                      .slice(0, 20)
                      .map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

              </div>
            </div>

            {/* ── Actions ── */}
            <div className="pt-10 flex justify-end gap-6 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-10 py-5 bg-surface-component text-text-primary rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-surface-deep transition-all active:scale-95"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-12 py-5 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Synchronizing...' : 'Commit Changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditProfile;
