
using System;
using Xunit;
using System.Net;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Texts.Application;
using Texts.Contracts;
using Texts.Infrastructure;

namespace Texts.Integration.Tests;

public class PlagiarismApiTests
{
    private readonly CustomWebApplicationFactory _factory;

    public PlagiarismApiTests()
    {
        _factory = new CustomWebApplicationFactory();
    }

    [Fact]
    public async Task DetectPlagiarism_WithMockedClient_ShouldReturnOkAndPredictableResult()
    {
        var googleClientMock = new Mock<IGoogleSearchClient>();
        googleClientMock
            .Setup(c => c.FindFirstMatchUrlAsync(It.IsAny<string>()))
            .ReturnsAsync("http://mocked-url.com/found");

        var factory = new CustomWebApplicationFactory();
        var client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddScoped<IGoogleSearchClient>(_ => googleClientMock.Object);
            });
        }).CreateClient();
        
        var request = new DetectPlagiarismRequest("This sentence is a test.", 4, 1);
        
        var response = await client.PostAsJsonAsync("/plagiarism/detect", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>();
    
        Assert.NotNull(dto);
        Assert.Single(dto.PotentialSources);
        Assert.Equal("http://mocked-url.com/found", dto.PotentialSources.First().Url);
    }
    
    [Fact]
    public async Task DetectFilePlagiarism_WithMockedClientAndValidFile_ShouldReturnOkAndCorrectResult()
    {
        var googleClientMock = new Mock<IGoogleSearchClient>();
        googleClientMock.Setup(c => c.FindFirstMatchUrlAsync("this is a")).ReturnsAsync("http://mocked.com/found");
        googleClientMock.Setup(c => c.FindFirstMatchUrlAsync("is a test")).ReturnsAsync((string?)null);

        var factory = new CustomWebApplicationFactory();
        var client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddScoped<IGoogleSearchClient>(_ => googleClientMock.Object);
            });
        }).CreateClient();
        
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("This is a test file")), "file", "test.txt");
        form.Add(new StringContent("3"), "shingleSize");
        form.Add(new StringContent("1"), "sampleStep");
        
        var response = await client.PostAsync("/plagiarism/detect/file", form);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>();
        
        Assert.NotNull(dto);
        Assert.InRange(dto.Score, 0.323, 0.343);
        var source = Assert.Single(dto.PotentialSources);
        Assert.Equal("http://mocked.com/found", source.Url);
    }
    
    [Fact]
    public async Task DetectPlagiarism_WithEmptyBody_ShouldReturnBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsync("/plagiarism/detect", new StringContent("{}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DetectPlagiarism_WithInvalidBody_ShouldReturnBadRequest()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsync("/plagiarism/detect", new StringContent("{\"text123\": \"some text\"}", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DetectPlagiarism_WithServiceException_ShouldReturnInternalServerError()
    {
        var plagiarismDetectorMock = new Mock<IPlagiarismDetectorService>();
        plagiarismDetectorMock.Setup(s => s.DetectAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>()))
            .ThrowsAsync(new Exception("Test error"));

        var factory = new CustomWebApplicationFactory();
        var client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddScoped<IPlagiarismDetectorService>(_ => plagiarismDetectorMock.Object);
            });
        }).CreateClient();
        
        var request = new DetectPlagiarismRequest("This will fail.", 4, 1);
        var response = await client.PostAsJsonAsync("/plagiarism/detect", request);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    }
}
