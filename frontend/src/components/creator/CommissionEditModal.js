'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creatorApi } from '@/lib/api';

// Modal for editing commission settings directly from the profile page.
// Mirrors the commission fields from the settings page but in a focused modal.
export function CommissionEditModal({ profile, onClose, onSaved }) {
  const [commissionStatus, setCommissionStatus] = useState(profile.commissionStatus || 'closed');
  const [turnaround, setTurnaround] = useState(profile.commissionInfo?.turnaround || '');
  const [terms, setTerms] = useState(profile.commissionInfo?.terms || '');
  const [contactMethod, setContactMethod] = useState(profile.commissionInfo?.contactMethod || '');
  const [menuItems, setMenuItems] = useState(profile.commissionInfo?.menu || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addMenuItem = () => {
    setMenuItems([...menuItems, { name: '', price: '', description: '' }]);
  };

  const updateMenuItem = (index, field, value) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
  };

  const removeMenuItem = (index) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Send full profile update, preserving all non-commission fields
      await creatorApi.updateCreatorProfile({
        displayName: profile.displayName || null,
        bio: profile.bio || null,
        avatarUrl: profile.avatarUrl || null,
        bannerImageUrl: profile.bannerImageUrl || null,
        bannerPositionY: profile.bannerPositionY ?? 50,
        creatorType: profile.creatorType || null,
        commissionStatus,
        commissionInfo: {
          menu: menuItems.filter((m) => m.name && m.price),
          turnaround: turnaround || null,
          terms: terms || null,
          contactMethod: contactMethod || null,
        },
        supportLinks: profile.supportLinks || [],
      });

      onSaved();
    } catch (err) {
      console.error('Failed to save commissions:', err);
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200" onClick={onClose}>
      <div
        className="bg-background rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in-0 zoom-in-95 duration-200 transition-[height] duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Commission Settings</h3>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Status</label>
            <select
              value={commissionStatus}
              onChange={(e) => setCommissionStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="open">Open</option>
              <option value="waitlist">Waitlist</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Turnaround */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Turnaround time</label>
            <input
              type="text"
              placeholder="e.g. 1-2 weeks"
              value={turnaround}
              onChange={(e) => setTurnaround(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Contact method */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Contact method</label>
            <input
              type="text"
              placeholder="e.g. DM on Instagram"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Terms */}
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Terms</label>
            <textarea
              placeholder="e.g. 50% upfront payment required"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Menu Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Price menu</label>
              <Button
                variant="outline"
                size="sm"
                onClick={addMenuItem}
                className="hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-3 h-3 mr-1" /> Add item
              </Button>
            </div>
            {menuItems.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) => updateMenuItem(i, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateMenuItem(i, 'price', e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => removeMenuItem(i)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
