namespace Texts.Application;

public interface IShingleService
{
    string[] Extract(string text, int k);
}