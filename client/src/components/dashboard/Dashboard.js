import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_BASE_URL from '../../config';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: '',
    age: '',
    city: '',
    budget: '',
    bio: '',
    preferences: '',
    availability: 'looking',
    interests: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [roommates, setRoommates] = useState([]);
  const [roommateFilters, setRoommateFilters] = useState({
    city: '',
    gender: 'any',
    budgetMax: ''
  });
  const [roommatesLoading, setRoommatesLoading] = useState(false);
  const [didSearch, setDidSearch] = useState(false);
  const navigate = useNavigate();
  const roommateFiltersRef = useRef(roommateFilters);

  useEffect(() => {
    roommateFiltersRef.current = roommateFilters;
  }, [roommateFilters]);

  const authConfig = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }, []);

  const hydrateProfileForm = useCallback(
    data => ({
      name: data?.name || '',
      phone: data?.phone || '',
      gender: data?.gender || '',
      age: data?.age || '',
      city: data?.city || '',
      budget: data?.budget || '',
      bio: data?.bio || '',
      preferences: data?.preferences || '',
      availability: data?.availability || 'looking',
      interests: Array.isArray(data?.interests) ? data.interests.join(', ') : data?.interests || ''
    }),
    []
  );

  const profileCompletion = useMemo(() => {
    if (!user) return 0;
    const fields = ['phone', 'gender', 'age', 'city', 'budget', 'bio', 'preferences', 'interests'];
    const filled = fields.reduce((acc, field) => {
      const value = user[field];
      if (Array.isArray(value)) {
        return value.length ? acc + 1 : acc;
      }
      return value ? acc + 1 : acc;
    }, 0);
    return Math.round((filled / fields.length) * 100);
  }, [user]);

  const interestChips = useMemo(() => {
    if (!user) return [];
    if (Array.isArray(user.interests)) return user.interests;
    if (typeof user.interests === 'string') {
      return user.interests.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  }, [user]);

  const heroStats = useMemo(
    () => [
      { label: 'Profile complete', value: `${profileCompletion}%` },
      { label: 'Matches found', value: roommates.length },
      { label: 'Budget focus', value: user?.budget ? `Rs.${user.budget}` : 'Flexible' }
    ],
    [profileCompletion, roommates.length, user]
  );

  const fetchRoommates = useCallback(
    async (filtersOverride) => {
      const config = authConfig();
      if (!config) {
        navigate('/login');
        return;
      }

      const params = filtersOverride || roommateFiltersRef.current;

      setRoommatesLoading(true);
      setDidSearch(true);

      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/roommates`, {
          ...config,
          params
        });
        setRoommates(response.data.data);
        if (!response.data.data.length) {
          toast.info('No matching roommates yet. Try adjusting filters.');
        }
      } catch (err) {
        toast.error('Failed to fetch roommate matches');
      } finally {
        setRoommatesLoading(false);
      }
    },
    [authConfig, navigate]
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const config = authConfig();

        if (!config) {
          navigate('/login');
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/api/users/profile`, config);
        const profile = res.data.data;
        setUser(profile);
        setProfileForm(hydrateProfileForm(profile));

        const defaultFilters = {
          city: profile.city || '',
          gender: 'any',
          budgetMax: profile.budget ? String(profile.budget) : ''
        };

        setRoommateFilters(prev => ({ ...prev, ...defaultFilters }));
        roommateFiltersRef.current = { ...roommateFiltersRef.current, ...defaultFilters };
        fetchRoommates(defaultFilters);
      } catch (err) {
        localStorage.removeItem('token');
        navigate('/login');
        toast.error('Please log in to continue');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [authConfig, fetchRoommates, hydrateProfileForm, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleProfileChange = e => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async e => {
    e.preventDefault();
    const config = authConfig();
    if (!config) {
      navigate('/login');
      return;
    }

    const payload = {
      ...profileForm,
      age: profileForm.age ? Number(profileForm.age) : null,
      budget: profileForm.budget ? Number(profileForm.budget) : null,
      interests: profileForm.interests
        ? profileForm.interests.split(',').map(item => item.trim()).filter(Boolean)
        : []
    };

    setProfileSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/api/users/profile`, payload, config);
      setUser(res.data.data);
      setProfileForm(hydrateProfileForm(res.data.data));
      toast.success('Profile updated');
      fetchRoommates();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setRoommateFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = e => {
    e.preventDefault();
    fetchRoommates();
  };

  const handleResetFilters = () => {
    if (!user) return;
    const defaults = {
      city: user.city || '',
      gender: 'any',
      budgetMax: user.budget ? String(user.budget) : ''
    };
    setRoommateFilters(defaults);
    roommateFiltersRef.current = defaults;
    fetchRoommates(defaults);
  };

  const handleCopyContact = async email => {
    if (!email) {
      toast.info('This roommate has not shared contact details yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied to clipboard');
    } catch {
      toast.info(`Email: ${email}`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell py-4">
      <div className="container">
        <div className="dashboard-hero rounded-4 p-4 p-md-5 mb-4 text-white">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
            <div>
              <p className="text-uppercase fw-semibold small mb-1 opacity-75">Welcome back</p>
              <h2 className="fw-bold mb-2">Hi {user?.name?.split(' ')[0] || 'Roomie'}, ready to find your match?</h2>
              <p className="mb-0 opacity-75">
                Keep your profile updated to unlock better roommate recommendations tailored to {user?.city || 'your city'}.
              </p>
            </div>
            <div className="hero-stats d-flex flex-wrap gap-3">
              {heroStats.map(stat => (
                <div key={stat.label} className="hero-stat-card text-center px-3 py-2 rounded-3">
                  <div className="display-6 fw-bold mb-0">{stat.value}</div>
                  <small className="text-uppercase">{stat.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="glass-panel h-100">
              <div className="text-center">
                <div className="profile-avatar mb-3 mx-auto d-flex align-items-center justify-content-center">
                  <span className="display-6 text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <h4 className="fw-semibold">{user?.name}</h4>
                <p className="text-muted mb-2">{user?.email}</p>
                <div className="profile-progress mb-4">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Profile completeness</span>
                    <span>{profileCompletion}%</span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div
                      className={`progress-bar ${profileCompletion > 70 ? 'bg-success' : 'bg-warning'}`}
                      role="progressbar"
                      style={{ width: `${profileCompletion}%` }}
                      aria-valuenow={profileCompletion}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                  </div>
                </div>
                <button className="btn btn-soft-light btn-sm w-100" onClick={handleLogout}>
                  Logout
                </button>
              </div>
              <hr />
              <div>
                <p className="text-uppercase text-muted small mb-2">Quick preferences</p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="chip">{user?.city || 'Anywhere'}</span>
                  <span className="chip">{user?.availability === 'looking' ? 'Actively looking' : user?.availability || 'Status N/A'}</span>
                  <span className="chip">{user?.budget ? `$${user.budget} budget` : 'Budget flexible'}</span>
                </div>
                {interestChips.length > 0 && (
                  <>
                    <p className="text-uppercase text-muted small mt-3 mb-2">Interests</p>
                    <div className="d-flex flex-wrap gap-2">
                      {interestChips.map(chip => (
                        <span className="chip chip-soft" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="dashboard-card mb-4">
              <div className="card-header bg-transparent border-0 pb-0">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <p className="text-uppercase small text-muted mb-1">Your story</p>
                    <h5 className="mb-0">Edit Profile</h5>
                  </div>
                  <span className="badge bg-primary-subtle text-primary">Higher completion = better matches</span>
                </div>
              </div>
              <div className="card-body">
                <form onSubmit={handleProfileSubmit} className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" name="name" value={profileForm.name} onChange={handleProfileChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      placeholder="e.g. +1 234 567 890"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Gender</label>
                    <select className="form-select" name="gender" value={profileForm.gender} onChange={handleProfileChange}>
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Age</label>
                    <input type="number" className="form-control" name="age" min="18" value={profileForm.age} onChange={handleProfileChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Monthly Budget ($)</label>
                    <input type="number" className="form-control" name="budget" min="0" value={profileForm.budget} onChange={handleProfileChange} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      name="city"
                      value={profileForm.city}
                      onChange={handleProfileChange}
                      placeholder="Where are you looking?"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Availability</label>
                    <select className="form-select" name="availability" value={profileForm.availability} onChange={handleProfileChange}>
                      <option value="looking">Actively looking</option>
                      <option value="matched">Already matched</option>
                      <option value="not-looking">Not looking</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Short Bio</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="bio"
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      placeholder="Tell potential roommates about your lifestyle, schedule, etc."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Roommate Preferences</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      name="preferences"
                      value={profileForm.preferences}
                      onChange={handleProfileChange}
                      placeholder="Quiet hours, cleanliness expectations, hobbies, etc."
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Interests (comma separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      name="interests"
                      value={profileForm.interests}
                      onChange={handleProfileChange}
                      placeholder="Yoga, Cooking, Gaming..."
                    />
                  </div>
                  <div className="col-12 d-flex justify-content-end mt-2">
                    <button type="submit" className="btn btn-gradient" disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header bg-transparent border-0 pb-0">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <p className="text-uppercase small text-muted mb-1">smart matches</p>
                    <h5 className="mb-0">Find Roommates</h5>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleResetFilters}>
                      Reset filters
                    </button>
                    <button className="btn btn-primary btn-sm" type="button" onClick={fetchRoommates}>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <form className="row g-3" onSubmit={handleFilterSubmit}>
                  <div className="col-md-4">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      name="city"
                      value={roommateFilters.city}
                      onChange={handleFilterChange}
                      placeholder="Any"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Gender</label>
                    <select className="form-select" name="gender" value={roommateFilters.gender} onChange={handleFilterChange}>
                      <option value="any">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Max Budget ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="budgetMax"
                      min="0"
                      value={roommateFilters.budgetMax}
                      onChange={handleFilterChange}
                    />
                  </div>
                  <div className="col-12 d-flex justify-content-end">
                    <button type="submit" className="btn btn-gradient" disabled={roommatesLoading}>
                      {roommatesLoading ? 'Searching...' : 'Find Roommates'}
                    </button>
                  </div>
                </form>
                <hr />
                {roommatesLoading && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}
                {!roommatesLoading && !roommates.length && didSearch && (
                  <div className="empty-state text-center py-4">
                    <h6 className="fw-semibold mb-2">No matches yet</h6>
                    <p className="text-muted mb-0">Try broadening your city or raising your max budget to see more roommates.</p>
                  </div>
                )}
                {!roommatesLoading && roommates.length > 0 && (
                  <div className="row g-3">
                    {roommates.map(match => (
                      <div className="col-md-6" key={match.id}>
                        <div className="roommate-card h-100">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <h6 className="mb-0">{match.name}</h6>
                              <small className="text-muted">{match.city || 'City N/A'}</small>
                            </div>
                            <span className={`badge ${match.availability === 'looking' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                              {match.availability === 'looking' ? 'Looking' : match.availability || 'Status unknown'}
                            </span>
                          </div>
                          {match.bio && <p className="mb-2 small">{match.bio}</p>}
                          <ul className="list-unstyled small text-muted mb-3 roommate-stats">
                            <li>Budget: {match.budget ? `$${match.budget}` : 'Not shared'}</li>
                            <li>Gender: {match.gender || 'N/A'}</li>
                            <li>Availability: {match.availability}</li>
                          </ul>
                          {match.interests?.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mb-3">
                              {match.interests.slice(0, 4).map(tag => (
                                <span key={tag} className="chip chip-soft">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="d-flex gap-2">
                            <button className="btn btn-outline-primary btn-sm flex-fill" type="button" onClick={() => handleCopyContact(match.email)}>
                              Copy Email
                            </button>
                            <button className="btn btn-primary btn-sm flex-fill" type="button" onClick={() => toast.success('Interest sent!')}>
                              Show Interest
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
