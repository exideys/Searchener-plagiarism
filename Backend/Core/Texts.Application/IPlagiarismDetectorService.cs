using Texts.Domain;

namespace Texts.Application;

public interface IPlagiarismDetectorService
{
    Task<PlagiarismResult> DetectAsync(string text, int shingleSize, int sampleStep);
}