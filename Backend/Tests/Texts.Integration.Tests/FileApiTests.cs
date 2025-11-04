using Xunit;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;

using Texts.Contracts;

namespace Texts.Api.Tests;

public class FileApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private const long MaxFileSize = 10 * 1024 * 1024;

    public FileApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task AnalyzeFile_WithValidFile_ShouldReturnOkAndCorrectStats()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("a b a")), "file", "note.txt");
        
        var response = await _client.PostAsync("/file/analyze", form);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>();

        Assert.NotNull(dto);
        Assert.Equal(3, dto.Total);
        Assert.True(dto.Counts.ContainsKey("a"));
        Assert.Equal(2, dto.Counts["a"]);
    }

    [Fact]
    public async Task AnalyzeFile_WhenFileIsTooLarge_ShouldReturnPayloadTooLarge()
    {
        using var form = new MultipartFormDataContent();
        var largeFileBytes = new byte[MaxFileSize + 1]; 
        form.Add(new ByteArrayContent(largeFileBytes), "file", "largefile.txt");

        var response = await _client.PostAsync("/file/analyze", form);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }
    
    [Fact]
    public async Task CompareFiles_WithTwoValidFiles_ShouldReturnOkAndComparisonResult()
    {
        using var form = new MultipartFormDataContent();
        
        var bytes1 = Encoding.UTF8.GetBytes("one two three four");
        var bytes2 = Encoding.UTF8.GetBytes("one two three five six");
        
        form.Add(new ByteArrayContent(bytes1), "file1", "file1.txt");
        form.Add(new ByteArrayContent(bytes2), "file2", "file2.txt");
        form.Add(new StringContent("3"), "shingleSize");
        
        var response = await _client.PostAsync("/files/compare", form);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<FileComparisonResult>();

        Assert.NotNull(dto);
        Assert.InRange(dto.SimilarityPercentage, 0.24, 0.26);
        Assert.Equal(1, dto.TotalCommonShingles);
        Assert.Equal(2, dto.TotalFirstTextShingles);
        Assert.Equal(3, dto.TotalSecondTextShingles);
        Assert.Single(dto.CommonShingles);
        Assert.Equal("one two three", dto.CommonShingles[0].MatchedShingle);
    }
    
    [Fact]
    public async Task CompareFiles_WithOneFile_ShouldReturnBadRequest()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("this is a test")), "file1", "file1.txt");
        form.Add(new StringContent("3"), "shingleSize");
        
        var response = await _client.PostAsync("/files/compare", form);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}