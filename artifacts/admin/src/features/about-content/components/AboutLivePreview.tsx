import { GraduationCap, Globe, Target } from "lucide-react";

type LivePreviewData = {
  bio?: string;
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
    description?: string;
  }>;
  languages?: Array<{
    name?: string;
    level?: number;
  }>;
  interests?: string[];
};

export function AboutLivePreview({ data }: { data: LivePreviewData }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">About Me</h3>
        {data.bio ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data.bio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No bio yet...</p>
        )}
      </div>

      {data.education && data.education.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Education
          </h4>
          <div className="space-y-2">
            {data.education.map((edu) => (
              <div key={`${edu.degree}-${edu.institution}-${edu.year}`} className="text-sm">
                <div className="font-medium">{edu.degree}</div>
                <div className="text-muted-foreground">
                  {edu.institution} · {edu.year}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Languages
          </h4>
          <div className="space-y-2">
            {data.languages.map((lang) => (
              <div key={lang.name}>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>{lang.name}</span>
                  <span>{lang.level}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${lang.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.interests && data.interests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Target className="h-4 w-4" />
            Interests
          </h4>
          <div className="flex flex-wrap gap-1">
            {data.interests.map((interest) => (
              <span
                key={interest}
                className="text-xs px-2 py-0.5 bg-muted rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
