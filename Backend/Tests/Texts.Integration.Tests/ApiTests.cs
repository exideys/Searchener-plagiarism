using Xunit;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Texts.Contracts;
using Texts.Integration.Tests;

namespace Texts.Api.Tests;

public class TextApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public TextApiTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AnalyzeText_WithValidText_ShouldReturnOkAndCorrectStats()
    {
        var request = new AnalyzeTextRequest("aa bb aa");
        
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>();

        Assert.NotNull(dto);
        Assert.Equal(3, dto!.Total);
        Assert.Contains(new KeyValuePair<string, int>("aa", 2), dto.Counts);
        Assert.Equal(2, dto.Counts["aa"]);
    }

    [Fact]
    public async Task AnalyzeText_WithWhitespaceText_ShouldReturnBadRequest()
    {
        var request = new AnalyzeTextRequest(" ");
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnalyzeText_WithEmptyBody_ShouldReturnBadRequest()
    {
        var request = new AnalyzeTextRequest(string.Empty);
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ExtractShingles_WithValidRequest_ShouldReturnOkAndShingleStats()
    {
        var request = new ExtractShinglesRequest("one two three one two", 2);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<ExtractShinglesResponse>();

        Assert.NotNull(dto);
        Assert.Equal(4, dto!.Total);
        Assert.Contains("one two", dto.Counts);
        Assert.Equal(2, dto.Counts["one two"]);
        Assert.Equal(0.5, dto.Frequencies["one two"]);
    }

    [Fact]
    public async Task ExtractShingles_WithInvalidK_ShouldReturnBadRequest()
    {
        var request = new ExtractShinglesRequest("some text", 0);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DetectPlagiarism_WithValidRequest_ShouldReturnOkAndPlagiarismResult()
    {
                var request = new DetectPlagiarismRequest("text to check", 3, 1);
        var response = await _client.PostAsJsonAsync("/plagiarism/detect", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>();

        Assert.NotNull(dto);
    }

    [Fact]
    public async Task DetectPlagiarism_WithEmptyTextToCheck_ShouldReturnBadRequest()
    {
        var request = new DetectPlagiarismRequest(string.Empty, 3, 1);
        var response = await _client.PostAsJsonAsync("/plagiarism/detect", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CompareFiles_WithValidRequest_ShouldReturnOkAndComparisonResult()
    {
        var file1Content = "This is file one.";
        var file2Content = "This is file two.";

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(file1Content), "file1", "file1.txt");
        form.Add(new StringContent(file2Content), "file2", "file2.txt");
        form.Add(new StringContent("3"), "shingleSize");

        var response = await _client.PostAsync("/files/compare", form);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<FileComparisonResponse>();

        Assert.NotNull(dto);
    }

    [Fact]
    public async Task CompareFiles_WithEmptyFileContent_ShouldReturnBadRequest()
    {
        var file1Content = string.Empty;
        var file2Content = "some content";

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(file1Content), "file1", "empty.txt");
        form.Add(new StringContent(file2Content), "file2", "somecontent.txt");
        form.Add(new StringContent("3"), "shingleSize");

        var response = await _client.PostAsync("/files/compare", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}