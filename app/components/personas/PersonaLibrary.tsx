'use client';

import { useState } from 'react';
import { Persona, DepartmentType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PersonaLibrary({ personas }: { personas: Persona[] }) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<
    DepartmentType | 'ALL'
  >('ALL');

  const filtered = personas.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      departmentFilter === 'ALL' ||
      p.primaryDepartment === departmentFilter ||
      p.secondaryDepartments.includes(departmentFilter);

    return matchesSearch && matchesDepartment;
  });

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'executive':
        return 'bg-purple-100 text-purple-800';
      case 'business':
        return 'bg-blue-100 text-blue-800';
      case 'technical':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Persona Library</h2>
        <p className="text-gray-600">
          Pre-built personas with pain points, messaging preferences, and content
          types
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search personas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Select
          value={departmentFilter}
          onValueChange={(value) =>
            setDepartmentFilter(value as DepartmentType | 'ALL')
          }
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {Object.values(DepartmentType).map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline">+ Create Custom Persona</Button>
      </div>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((persona) => (
          <div
            key={persona.id}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{persona.name}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {persona.description}
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {persona.primaryDepartment?.replace(/_/g, ' ') ?? '—'}
                </Badge>
                <Badge className={getToneColor(persona.messagingTone)}>
                  {persona.messagingTone} tone
                </Badge>
              </div>
            </div>

            {/* Typical Titles */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Typical Titles
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.includeTitles.slice(0, 3).map((title, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {title}
                  </Badge>
                ))}
                {persona.includeTitles.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{persona.includeTitles.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Pain Points */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Top Pain Points
              </div>
              <ul className="text-sm space-y-1">
                {persona.painPoints.slice(0, 3).map((pain, i) => (
                  <li key={i} className="text-gray-700">
                    • {pain}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content Preferences */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Content Types
              </div>
              <div className="flex flex-wrap gap-1">
                {persona.contentTypes.slice(0, 3).map((type, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button size="sm" variant="outline" className="flex-1">
                View Details
              </Button>
              <Button size="sm" className="flex-1">
                Use in Play
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">No personas match your filters</p>
        </div>
      )}
    </div>
  );
}
