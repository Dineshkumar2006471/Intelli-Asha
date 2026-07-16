import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Mock the auth context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { displayName: 'Asha Devi', photoURL: '9876543210' },
    logout: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  it('should render field worker navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/app/field']}>
        <Sidebar role="field-worker" />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Log a Visit')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('should render supervisor navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/supervisor']}>
        <Sidebar role="supervisor" />
      </MemoryRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Workers')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('should display user initials', () => {
    render(
      <MemoryRouter>
        <Sidebar role="field-worker" />
      </MemoryRouter>
    );

    expect(screen.getByText('AD')).toBeInTheDocument(); // Asha Devi → AD
  });

  it('should display the user display name', () => {
    render(
      <MemoryRouter>
        <Sidebar role="field-worker" />
      </MemoryRouter>
    );

    expect(screen.getByText('Asha Devi')).toBeInTheDocument();
  });
});
