import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import {
  Trees,
  MapPin,
  Calendar,
  Users,
  Target,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import CountrySelect from "./CountrySelect";
import RegionSelect from "./RegionSelect";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

interface NewProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    id: 1,
    title: "Project Details",
    description: "Basic information about your project",
  },
  {
    id: 2,
    title: "Location & Area",
    description: "Where the reforestation will take place",
  },
  {
    id: 3,
    title: "Trees & Species",
    description: "Types and quantity of trees to plant",
  },
  {
    id: 4,
    title: "Partners & Timeline",
    description: "Collaborators and project schedule",
  },
];

export function NewProjectForm({
  open,
  onOpenChange,
}: NewProjectFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [projectImage, setProjectImage] = useState<
    string | null
  >(null);

  // Form data states
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    description: "",
    objectives: "",
  });

  const [locationArea, setLocationArea] = useState({
    country: "",
    region: "",
    coordinates: "",
    areaTarget: "",
    areaUnit: "hectares",
  });

  const [treesSpecies, setTreesSpecies] = useState({
    treesTarget: "",
    speciesList: [] as string[],
    currentSpecies: "",
  });

  const [partnersTimeline, setPartnersTimeline] = useState({
    partners: [] as string[],
    currentPartner: "",
    startDate: "",
    endDate: "",
    estimatedDuration: "",
  });

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProjectImage(reader.result as string);
        toast.success("Project image uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const addSpecies = () => {
    if (treesSpecies.currentSpecies.trim()) {
      setTreesSpecies({
        ...treesSpecies,
        speciesList: [
          ...treesSpecies.speciesList,
          treesSpecies.currentSpecies.trim(),
        ],
        currentSpecies: "",
      });
    }
  };

  const removeSpecies = (index: number) => {
    setTreesSpecies({
      ...treesSpecies,
      speciesList: treesSpecies.speciesList.filter(
        (_, i) => i !== index,
      ),
    });
  };

  const addPartner = () => {
    if (partnersTimeline.currentPartner.trim()) {
      setPartnersTimeline({
        ...partnersTimeline,
        partners: [
          ...partnersTimeline.partners,
          partnersTimeline.currentPartner.trim(),
        ],
        currentPartner: "",
      });
    }
  };

  const removePartner = (index: number) => {
    setPartnersTimeline({
      ...partnersTimeline,
      partners: partnersTimeline.partners.filter(
        (_, i) => i !== index,
      ),
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!projectDetails.name.trim()) {
          toast.error("Please enter a project name");
          return false;
        }
        if (!projectDetails.description.trim()) {
          toast.error("Please enter a project description");
          return false;
        }
        return true;
      case 2:
        if (
          !locationArea.country.trim() ||
          !locationArea.region.trim()
        ) {
          toast.error("Please enter location details");
          return false;
        }
        if (
          !locationArea.areaTarget ||
          parseFloat(locationArea.areaTarget) <= 0
        ) {
          toast.error("Please enter a valid area target");
          return false;
        }
        return true;
      case 3:
        if (
          !treesSpecies.treesTarget ||
          parseFloat(treesSpecies.treesTarget) <= 0
        ) {
          toast.error("Please enter a valid tree target");
          return false;
        }
        if (treesSpecies.speciesList.length === 0) {
          toast.error("Please add at least one tree species");
          return false;
        }
        return true;
      case 4:
        if (!partnersTimeline.startDate) {
          toast.error("Please enter a start date");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) =>
        Math.min(prev + 1, steps.length),
      );
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;

    // Build payload
    const payload = {
      name: projectDetails.name.trim(),
      description: projectDetails.description.trim(),
      objectives: projectDetails.objectives.trim() || null,
      image_url: projectImage || null,
      country: locationArea.country.trim() || null,
      region: locationArea.region.trim() || null,
      coordinates: locationArea.coordinates.trim() || null,
      area_target: locationArea.areaTarget ? Number(locationArea.areaTarget) : null,
      area_unit: locationArea.areaUnit || 'hectares',
      trees_target: treesSpecies.treesTarget ? Number(treesSpecies.treesTarget) : null,
      species: treesSpecies.speciesList,
      partners: partnersTimeline.partners,
      start_date: partnersTimeline.startDate || null,
      end_date: partnersTimeline.endDate || null,
      estimated_duration: partnersTimeline.estimatedDuration || null,
    } as any;

    // Submit to API
    (async () => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error || 'Failed to create project');
          return;
        }
        toast.success('Project created successfully!', {
          description: `${projectDetails.name} has been added to your reforestation projects.`,
        });

        // Reset form and close dialog
        resetForm();
        onOpenChange(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        toast.error('Network error while creating project');
      }
    })();
  };

  const resetForm = () => {
    setCurrentStep(1);
    setProjectImage(null);
    setProjectDetails({
      name: "",
      description: "",
      objectives: "",
    });
    setLocationArea({
      country: "",
      region: "",
      coordinates: "",
      areaTarget: "",
      areaUnit: "hectares",
    });
    setTreesSpecies({
      treesTarget: "",
      speciesList: [],
      currentSpecies: "",
    });
    setPartnersTimeline({
      partners: [],
      currentPartner: "",
      startDate: "",
      endDate: "",
      estimatedDuration: "",
    });
  };

  const progressPercentage = (currentStep / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DialogHeader>
          <DialogTitle>
            Start New Reforestation Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to track reforestation efforts
            and environmental impact.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {steps[currentStep - 1].title}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
          />
        </div>

        {/* Step 1: Project Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">
                Project Name *
              </Label>
              <Input
                id="project-name"
                placeholder="e.g., Amazon Restoration Initiative"
                value={projectDetails.name}
                onChange={(e) =>
                  setProjectDetails({
                    ...projectDetails,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose and goals of this reforestation project..."
                rows={4}
                value={projectDetails.description}
                onChange={(e) =>
                  setProjectDetails({
                    ...projectDetails,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objectives">
                Key Objectives (Optional)
              </Label>
              <Textarea
                id="objectives"
                placeholder="List the main objectives, such as biodiversity restoration, carbon sequestration goals, etc..."
                rows={3}
                value={projectDetails.objectives}
                onChange={(e) =>
                  setProjectDetails({
                    ...projectDetails,
                    objectives: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Project Cover Image (Optional)</Label>
              <div className="flex items-center gap-3">
                {projectImage ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                    <img
                      src={projectImage}
                      alt="Project"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setProjectImage(null)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="project-image"
                    className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">
                      Upload Image
                    </span>
                  </label>
                )}
                <input
                  id="project-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Area */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <CountrySelect
                  id="country"
                  value={locationArea.country}
                  onChange={(val) =>
                    setLocationArea({
                      ...locationArea,
                      country: val,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region/State *</Label>
                <RegionSelect
                  id="region"
                  country={locationArea.country}
                  value={locationArea.region}
                  onChange={(val) =>
                    setLocationArea({
                      ...locationArea,
                      region: val,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coordinates">
                GPS Coordinates (Optional)
              </Label>
              <Input
                id="coordinates"
                placeholder="e.g., -3.4653, -62.2159"
                value={locationArea.coordinates}
                onChange={(e) =>
                  setLocationArea({
                    ...locationArea,
                    coordinates: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Format: latitude, longitude
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area-target">Target Area *</Label>
              <div className="flex gap-2">
                <Input
                  id="area-target"
                  type="number"
                  placeholder="500"
                  value={locationArea.areaTarget}
                  onChange={(e) =>
                    setLocationArea({
                      ...locationArea,
                      areaTarget: e.target.value,
                    })
                  }
                  className="flex-1"
                />
                <div className="flex-1">
                  <Select
                    value={locationArea.areaUnit}
                    onValueChange={(val) =>
                      setLocationArea({ ...locationArea, areaUnit: val })
                    }
                  >
                    <SelectTrigger size="sm" className="w-full" />
                    <SelectContent>
                      <SelectItem value="hectares">Hectares</SelectItem>
                      <SelectItem value="acres">Acres</SelectItem>
                      <SelectItem value="km2">Km²</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm mb-1">
                    Location Preview
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {locationArea.region || "Region"},{" "}
                    {locationArea.country || "Country"}
                    {locationArea.areaTarget &&
                      ` - ${locationArea.areaTarget} ${locationArea.areaUnit}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Trees & Species */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trees-target">
                Target Number of Trees *
              </Label>
              <Input
                id="trees-target"
                type="number"
                placeholder="e.g., 67000"
                value={treesSpecies.treesTarget}
                onChange={(e) =>
                  setTreesSpecies({
                    ...treesSpecies,
                    treesTarget: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Tree Species *</Label>
              <div className="flex gap-2">
                <Input
                  id="species"
                  placeholder="e.g., Brazil Nut, Mahogany, etc."
                  value={treesSpecies.currentSpecies}
                  onChange={(e) =>
                    setTreesSpecies({
                      ...treesSpecies,
                      currentSpecies: e.target.value,
                    })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSpecies();
                    }
                  }}
                />
                <Button type="button" onClick={addSpecies}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click Add to include a species
              </p>
            </div>

            {treesSpecies.speciesList.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Selected Species (
                  {treesSpecies.speciesList.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {treesSpecies.speciesList.map(
                    (species, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1"
                      >
                        <Trees className="w-3 h-3" />
                        {species}
                        <button
                          onClick={() => removeSpecies(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm mb-1">Planting Goal</p>
                  <p className="text-sm text-muted-foreground">
                    {treesSpecies.treesTarget
                      ? `${parseInt(treesSpecies.treesTarget).toLocaleString()} trees`
                      : "Set your tree target"}
                    {treesSpecies.speciesList.length > 0 &&
                      ` across ${treesSpecies.speciesList.length} species`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Partners & Timeline */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partners">
                Project Partners (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="partners"
                  placeholder="e.g., Green Earth Foundation, Local Communities, etc."
                  value={partnersTimeline.currentPartner}
                  onChange={(e) =>
                    setPartnersTimeline({
                      ...partnersTimeline,
                      currentPartner: e.target.value,
                    })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPartner();
                    }
                  }}
                />
                <Button type="button" onClick={addPartner}>
                  Add
                </Button>
              </div>
            </div>

            {partnersTimeline.partners.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Project Partners (
                  {partnersTimeline.partners.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {partnersTimeline.partners.map(
                    (partner, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="gap-1"
                      >
                        <Users className="w-3 h-3" />
                        {partner}
                        <button
                          onClick={() => removePartner(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={partnersTimeline.startDate}
                  onChange={(e) =>
                    setPartnersTimeline({
                      ...partnersTimeline,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">
                  Expected End Date (Optional)
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={partnersTimeline.endDate}
                  onChange={(e) =>
                    setPartnersTimeline({
                      ...partnersTimeline,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">
                Estimated Duration (Optional)
              </Label>
              <Input
                id="duration"
                placeholder="e.g., 2 years, 18 months, etc."
                value={partnersTimeline.estimatedDuration}
                onChange={(e) =>
                  setPartnersTimeline({
                    ...partnersTimeline,
                    estimatedDuration: e.target.value,
                  })
                }
              />
            </div>

            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm mb-2">
                    Ready to Create Project
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {projectDetails.name} -{" "}
                    {locationArea.region},{" "}
                    {locationArea.country}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {treesSpecies.treesTarget &&
                      `${parseInt(treesSpecies.treesTarget).toLocaleString()} trees`}
                    {locationArea.areaTarget &&
                      ` on ${locationArea.areaTarget} ${locationArea.areaUnit}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}