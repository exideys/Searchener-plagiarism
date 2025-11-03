
using System.Numerics;

namespace Texts.Domain;

public class FileComparisonResult
{
    public double SimilarityPercentage { get; set; }
    public IReadOnlyList<MatchedShingles> CommonShingles { get; set; } = new List<MatchedShingles>();
    public int TotalFirstTextShingles { get; set; }  
    public int TotalSecondTextShingles { get; set; } 
    public int TotalCommonShingles { get; set; } 
}
