using Texts.Domain; 

public interface IShingleService
{
    ShingleAnalyzer Extract(string text, int k); 
}