using Texts.Domain;

namespace Texts.Application;

public interface IFileComparerService
{
    Task<FileComparisonResult> CompareAsync(string text1, string text2, int shingleSize, int q);
}
