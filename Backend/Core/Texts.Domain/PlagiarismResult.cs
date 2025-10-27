namespace Texts.Domain;

public class PlagiarismResult
{
    public double Score { get; set; } 
    public List<SourceMatch> PotentialSources { get; set; } = new();
}

public class SourceMatch
{
    public List<string> MatchedShingles { get; set; } = new(); 
    public string Url { get; set; } = string.Empty;
}