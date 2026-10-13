'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Label, Input, Textarea } from '@urgent/ui';

type OnboardingStep = 'mode' | 'profile';

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('mode');
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [skippedProfile, setSkippedProfile] = useState(false);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');

  const handleModeToggle = (mode: string) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const handleModeContinue = () => {
    if (selectedModes.length === 0) {
      alert('Please select at least one mode to continue');
      return;
    }

    // TODO: Call POST /onboarding/modes with selectedModes
    // For now, just move to profile step
    setStep('profile');
  };

  const handleProfileSubmit = async () => {
    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      alert('First name and last name are required');
      return;
    }

    // TODO: Call PUT /users/me/profile with { firstName, lastName, bio }
    // For now, just navigate to dashboard
    router.push('/dashboard');
  };

  const handleSkipProfile = () => {
    setSkippedProfile(true);
    // TODO: Mark profile as skipped (could be tracked in backend)
    router.push('/dashboard');
  };

  if (step === 'mode') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-2xl p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to Urgent.ng
            </h1>
            <p className="mt-2 text-gray-600">
              How do you want to use Urgent.ng? Select all that apply.
            </p>
          </div>

          <div className="space-y-4">
            {/* Sender mode */}
            <button
              type="button"
              onClick={() => handleModeToggle('sender')}
              className={`w-full rounded-lg border-2 p-6 text-left transition-all ${
                selectedModes.includes('sender')
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded border-2 ${
                    selectedModes.includes('sender')
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedModes.includes('sender') && (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    I need errands done
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Post tasks, get them done quickly by trusted runners in your
                    area.
                  </p>
                </div>
              </div>
            </button>

            {/* Runner mode */}
            <button
              type="button"
              onClick={() => handleModeToggle('runner')}
              className={`w-full rounded-lg border-2 p-6 text-left transition-all ${
                selectedModes.includes('runner')
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded border-2 ${
                    selectedModes.includes('runner')
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedModes.includes('runner') && (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    I want to earn money
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Pick up errands, complete them, and get paid. Work on your
                    own schedule.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8">
            <Button
              onClick={handleModeContinue}
              disabled={selectedModes.length === 0}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-gray-500">
            You can always change this later in your account settings.
          </p>
        </Card>
      </div>
    );
  }

  // Profile step
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Profile
          </h1>
          <p className="mt-2 text-gray-600">
            Help others know who you are. This improves trust and makes
            transactions smoother.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProfileSubmit();
          }}
          className="space-y-6"
        >
          {/* First Name */}
          <div>
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              required
              className="mt-1"
            />
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              required
              className="mt-1"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={4}
              maxLength={500}
              className="mt-1"
            />
            <p className="mt-1 text-sm text-gray-500">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <Button type="submit" className="flex-1" size="lg">
              Complete Profile
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkipProfile}
              className="flex-1"
              size="lg"
            >
              Skip for Now
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          You can update your profile anytime from your account settings.
        </p>
      </Card>
    </div>
  );
}
